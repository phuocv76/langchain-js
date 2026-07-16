import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isAllowedEmail,
  readBearerToken,
  readRoles,
} from '../agent-user-auth.js';

describe('agent user bearer parsing', () => {
  it('extracts the token from a well-formed Authorization header', () => {
    assert.equal(readBearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
    assert.equal(readBearerToken('bearer abc'), 'abc');
  });

  it('rejects missing, malformed, or non-bearer headers', () => {
    assert.equal(readBearerToken(undefined), undefined);
    assert.equal(readBearerToken(''), undefined);
    assert.equal(readBearerToken('Bearer'), undefined);
    assert.equal(readBearerToken('Basic abc'), undefined);
    assert.equal(readBearerToken('Bearer abc extra'), undefined);
  });
});

describe('agent user roles claim', () => {
  it('accepts only string arrays', () => {
    assert.deepEqual(readRoles(['admin', 'user']), ['admin', 'user']);
    assert.deepEqual(readRoles([]), []);
    assert.equal(readRoles('admin'), undefined);
    assert.equal(readRoles([1, 'admin']), undefined);
    assert.equal(readRoles(undefined), undefined);
  });
});

describe('allowed email domains', () => {
  const domains = ['asnet.com.vn'];

  it('allows everyone when no domain restriction is configured', () => {
    assert.equal(isAllowedEmail('a@b.com', true, []), true);
    assert.equal(isAllowedEmail(undefined, undefined, []), true);
  });

  it('allows verified emails on an allowed domain, case-insensitively', () => {
    assert.equal(isAllowedEmail('bao.nguyen@asnet.com.vn', true, domains), true);
    assert.equal(isAllowedEmail('Bao.Nguyen@ASNET.com.VN', true, domains), true);
  });

  it('rejects other domains and unverified or missing emails', () => {
    assert.equal(isAllowedEmail('someone@gmail.com', true, domains), false);
    assert.equal(isAllowedEmail('fake@asnet.com.vn', false, domains), false);
    assert.equal(isAllowedEmail('fake@asnet.com.vn', undefined, domains), false);
    assert.equal(isAllowedEmail(undefined, true, domains), false);
  });
});
