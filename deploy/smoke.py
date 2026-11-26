#!/usr/bin/env python3
"""Validate production TLS, routing, localized APIs and safe contact validation."""
import argparse
import json
import ssl
import sys
from urllib.error import HTTPError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, HTTPSHandler, ProxyHandler, Request, build_opener

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

def check(base, ca_file):
    base = base.rstrip('/')
    parsed = urlsplit(base)
    assert parsed.scheme == 'https' and parsed.hostname and parsed.port, 'Use https://hostname:9042'
    assert not parsed.path and not parsed.query and not parsed.fragment, 'Supply the origin only'
    opener = build_opener(ProxyHandler({}), HTTPSHandler(context=ssl.create_default_context(cafile=ca_file)), NoRedirect())
    def request(path, data=None, expected=200):
        req = Request(base + path, data=data, headers={'Content-Type': 'application/json'} if data else {})
        try:
            response = opener.open(req, timeout=25)
        except HTTPError as error:
            response = error
        with response:
            body = response.read()
            assert response.status == expected, f'{path}: HTTP {response.status}, expected {expected}'
            return body, response.headers
    plain = urlunsplit(('http', parsed.netloc, '/fr/parcours', 'smoke=1', ''))
    try:
        opener.open(plain, timeout=10)
        raise AssertionError('Plain HTTP did not redirect')
    except HTTPError as response:
        with response:
            assert response.code == 308
            assert response.headers['Location'] == base + '/fr/parcours?smoke=1'
    assert request('/healthz')[0].strip() == b'ok'
    assert json.loads(request('/api/')[0]) == {'status': 'ok'}
    for locale in ['fr', 'en']:
        for resource, endpoint in [('projects', 'projets'), ('journey', 'parcours'), ('skills', 'skills')]:
            api = json.loads(request(f'/api/{endpoint}?locale={locale}')[0])
            fallback = json.loads(request(f'/data/{resource}.{locale}.json')[0])
            assert isinstance(api, list) and api == fallback, f'{resource}.{locale}: API/fallback mismatch'
        assert set(json.loads(request(f'/api/documents?locale={locale}')[0])) == {'resumePdf', 'resumeDocx', 'portfolioPdf'}
    request('/api/does-not-exist', expected=404)
    request('/api/contact-form', data=b'{}', expected=400)
    print(f'Production smoke checks passed: {base}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url')
    parser.add_argument('--ca-file', help='Trust the public certificate without disabling TLS verification')
    args = parser.parse_args()
    try:
        check(args.url, args.ca_file)
    except Exception as error:
        print(f'Smoke check failed: {error}', file=sys.stderr)
        sys.exit(1)
