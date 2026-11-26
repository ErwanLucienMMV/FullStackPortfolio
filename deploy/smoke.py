#!/usr/bin/env python3
"""Validate production TLS, routing, localized APIs and safe contact validation."""
import argparse
import json
import ssl
import sys
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from urllib.error import HTTPError
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, HTTPSHandler, ProxyHandler, Request, build_opener

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets, self.text, self.ignored = [], [], 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ['script', 'style']: self.ignored += 1
        if tag == 'script' and attrs.get('src'): self.assets.append(attrs['src'])
        if tag == 'link' and attrs.get('rel') == 'stylesheet': self.assets.append(attrs['href'])
    def handle_endtag(self, tag):
        if tag in ['script', 'style']: self.ignored -= 1
    def handle_data(self, data):
        if not self.ignored: self.text.append(data)

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
    for path, target in [('/?smoke=1', '/fr?smoke=1'), ('/projets?project=42matcha', '/fr/projets?project=42matcha'),
                         ('/index.html?smoke=1', '/fr?smoke=1')]:
        assert request(path, expected=308)[1]['Location'] == target, 'Canonical redirect lost query parameters'
    pages = [
        ('/fr', 'fr', 'Développeur'), ('/en', 'en', 'Developer'),
        ('/fr/parcours', 'fr', 'Ingénieur d’études et développement'),
        ('/en/journey', 'en', 'Software Development Engineer'),
        ('/fr/projets', 'fr', 'Des projets, pas seulement des technologies'),
        ('/en/projects', 'en', 'Projects, more than just technologies'),
        ('/fr/competences', 'fr', 'Ma boîte à outils'), ('/en/skills', 'en', 'My toolkit'),
        ('/fr/contact', 'fr', 'Construisons quelque chose ensemble.'),
        ('/en/contact', 'en', "Let's build something together."),
        ('/fr/a-propos', 'fr', 'À propos de ce portfolio'), ('/en/about', 'en', 'About this portfolio'),
    ]
    def rendered_page(page):
        path, locale, expected = page
        document, headers = request(path)
        html = document.decode()
        assert f'lang="{locale}"' in html and 'text/html' in headers.get('Content-Type', ''), f'Invalid locale at {path}'
        assert 'ng-server-context="ssr"' in html and 'ngh=' in html, f'SSR/hydration markers missing at {path}'
        assert 'no-store' in headers.get('Cache-Control', '')
        parsed_page = Page()
        parsed_page.feed(html)
        assert expected in ''.join(parsed_page.text), f'Content missing from HTML at {path}'
        assert parsed_page.assets
        for asset in parsed_page.assets:
            asset_url = urlsplit(urljoin(base + ('/en/' if locale == 'en' else '/'), asset))
            assert asset_url.netloc == parsed.netloc, 'Unexpected external application asset'
            body, asset_headers = request(asset_url.path)
            assert body and 'text/html' not in asset_headers.get('Content-Type', ''), f'Missing asset {asset}'
    for page in pages: rendered_page(page)
    # Small bounded concurrent requests check isolation, not a load/stress test.
    with ThreadPoolExecutor(max_workers=2) as executor:
        list(executor.map(rendered_page, [pages[2], pages[3]] * 2))
    for path in ['/fr/not-a-page', '/en/not-a-page', '/not-a-page']:
        assert b'404' in request(path, expected=404)[0]
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
