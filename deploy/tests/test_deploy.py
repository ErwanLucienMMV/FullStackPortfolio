import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[2]

class DeployTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix='portfolio-deploy-test-')
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        (self.root / 'documents').mkdir()
        (self.root / 'tls').mkdir()
        for name in ['.env', 'backend.env', 'tls/fullchain.pem', 'tls/privkey.pem']:
            (self.root / name).touch()
        binary = self.root / 'bin'
        binary.mkdir()
        docker = binary / 'docker'
        docker.write_text('''#!/usr/bin/env python3
import json,pathlib,sys
args=sys.argv[1:]
i=args.index('-f')
release=pathlib.Path(args[i+1]).parent
root=release.parents[1]
command=args[i+2:]
with (root/'commands.log').open('a') as log: log.write(release.name+' '+' '.join(command)+'\\n')
if command==['config','--format','json']:
 print(json.dumps({'services':{'frontend':{'labels':{'io.fullstackportfolio.public-url':'https://localhost:9042'}}}}))
failure=root/('fail-'+command[0])
if failure.exists() and failure.read_text()==release.name: sys.exit(1)
''')
        docker.chmod(0o755)
        self.env = {**os.environ, 'PATH': str(binary) + os.pathsep + os.environ['PATH']}

    def release(self, name):
        release = self.root / 'releases' / name
        release.mkdir(parents=True)
        for file in ['compose.production.yaml', 'release.env']: (release / file).touch()
        (release / 'smoke.py').write_text('''import pathlib,sys
release=pathlib.Path(__file__).parent
root=release.parents[1]
with (root/'commands.log').open('a') as log: log.write(release.name+' smoke\\n')
failure=root/'fail-smoke'
sys.exit(1 if failure.exists() and failure.read_text()==release.name else 0)
''')
        return release

    def deploy(self, release):
        return subprocess.run(['bash', str(REPO / 'deploy/deploy.sh'), str(self.root), str(release)],
                              env=self.env, capture_output=True, text=True, timeout=10)

    def test_success_preserves_previous_release_and_promotes_only_after_verification(self):
        old, new = self.release('old'), self.release('new')
        (self.root / 'current').symlink_to(old)
        result = self.deploy(new)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / 'current').resolve(), new)
        self.assertEqual((self.root / 'previous').resolve(), old)
        log = (self.root / 'commands.log').read_text()
        self.assertLess(log.index('new pull'), log.index('new up'))
        self.assertIn('new smoke', log)

    def test_pull_failure_does_not_restart_containers(self):
        old, new = self.release('old'), self.release('new')
        (self.root / 'current').symlink_to(old)
        (self.root / 'fail-pull').write_text('new')
        self.assertNotEqual(self.deploy(new).returncode, 0)
        self.assertEqual((self.root / 'current').resolve(), old)
        self.assertNotIn(' up ', (self.root / 'commands.log').read_text())

    def test_health_or_smoke_failure_restores_previous_configuration(self):
        old, new = self.release('old'), self.release('new')
        (self.root / 'current').symlink_to(old)
        for failure in ['up', 'smoke']:
            with self.subTest(failure=failure):
                (self.root / f'fail-{failure}').write_text('new')
                result = self.deploy(new)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('Previous release restored and verified', result.stderr)
                self.assertEqual((self.root / 'current').resolve(), old)
                self.assertIn('old up -d --remove-orphans --wait --wait-timeout 120 --pull never', (self.root / 'commands.log').read_text())
                (self.root / f'fail-{failure}').unlink()

    def test_initial_failure_does_not_create_current(self):
        new = self.release('new')
        (self.root / 'fail-smoke').write_text('new')
        self.assertNotEqual(self.deploy(new).returncode, 0)
        self.assertFalse((self.root / 'current').exists())

    def test_manual_rollback_swaps_current_and_previous(self):
        old, new = self.release('old'), self.release('new')
        (self.root / 'current').symlink_to(new)
        (self.root / 'previous').symlink_to(old)
        self.assertEqual(self.deploy(old).returncode, 0)
        self.assertEqual((self.root / 'current').resolve(), old)
        self.assertEqual((self.root / 'previous').resolve(), new)

    def test_missing_configuration_fails_before_docker(self):
        new = self.release('new')
        (self.root / 'backend.env').unlink()
        self.assertNotEqual(self.deploy(new).returncode, 0)
        self.assertFalse((self.root / 'commands.log').exists())

@unittest.skipUnless(shutil.which('openssl'), 'OpenSSL required')
class CertificateTests(unittest.TestCase):
    def test_certificate_hostname_and_refusal_to_overwrite_existing_key(self):
        with tempfile.TemporaryDirectory() as root:
            env = {**os.environ, 'TLS_DOMAIN': 'portfolio.example.test', 'TLS_DAYS': '2'}
            command = ['bash', str(REPO / 'deploy/generate-certificate.sh'), root]
            result = subprocess.run(command, env=env, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            cert = str(Path(root) / 'tls/fullchain.pem')
            verified = subprocess.run(['openssl', 'verify', '-CAfile', cert, '-verify_hostname', 'portfolio.example.test', cert], capture_output=True)
            self.assertEqual(verified.returncode, 0, verified.stderr)
            key = (Path(root) / 'tls/privkey.pem').read_bytes()
            self.assertNotEqual(subprocess.run(command, env=env, capture_output=True).returncode, 0)
            self.assertEqual(key, (Path(root) / 'tls/privkey.pem').read_bytes())
            self.assertEqual(Path(root).stat().st_mode & 0o777, 0o700)

    def test_domain_rejects_configuration_injection(self):
        for domain in ['https://host.test', 'host:9042', '../host', 'host;return 200;', 'host\nDNS:evil.test']:
            with self.subTest(domain=domain), tempfile.TemporaryDirectory() as root:
                result = subprocess.run(['bash', str(REPO / 'deploy/generate-certificate.sh'), root],
                                        env={**os.environ, 'TLS_DOMAIN': domain}, capture_output=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse((Path(root) / 'tls').exists())
