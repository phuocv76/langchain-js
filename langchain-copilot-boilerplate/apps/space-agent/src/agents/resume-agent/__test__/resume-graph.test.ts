import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resumeGraph } from '../graph.js';
import {
  RESUME_SECTIONS,
  missingResumeSections,
} from '@agent/services/resume-api.js';

describe('resume graph shape', () => {
  it('exposes every review node in the drawable graph', async () => {
    const drawable = await resumeGraph.getGraphAsync();
    const nodeIds = Object.keys(drawable.nodes);
    for (const expected of [
      'loadResume',
      'assess',
      'reportUnavailable',
      'suggestImprovements',
      'summarizeStrengths',
    ]) {
      assert.ok(nodeIds.includes(expected), `missing node ${expected}`);
    }
  });

  it('branches conditionally after load and after assessment', async () => {
    const drawable = await resumeGraph.getGraphAsync();
    const conditional = drawable.edges
      .filter((edge) => edge.conditional)
      .map((edge) => `${edge.source}->${edge.target}`);
    for (const expected of [
      'loadResume->assess',
      'loadResume->reportUnavailable',
      'assess->suggestImprovements',
      'assess->summarizeStrengths',
    ]) {
      assert.ok(conditional.includes(expected), `missing branch ${expected}`);
    }
  });

  it('ends every terminal node at END', async () => {
    const drawable = await resumeGraph.getGraphAsync();
    const plain = drawable.edges
      .filter((edge) => !edge.conditional)
      .map((edge) => `${edge.source}->${edge.target}`);
    for (const expected of [
      'reportUnavailable->__end__',
      'suggestImprovements->__end__',
      'summarizeStrengths->__end__',
    ]) {
      assert.ok(plain.includes(expected), `missing edge ${expected}`);
    }
  });
});

describe('resume completeness routing data', () => {
  it('reports every section missing for an empty resume', () => {
    assert.deepEqual(missingResumeSections({ id: 'a@b.c' }), [
      ...RESUME_SECTIONS,
    ]);
  });

  it('reports nothing missing for a fully populated resume', () => {
    const full = {
      id: 'a@b.c',
      info: { fullName: 'A' },
      journeys: [{}],
      skills: [{}],
      education: [{}],
      links: [{}],
      certs: [{}],
    };
    assert.deepEqual(missingResumeSections(full), []);
  });

  it('treats empty arrays and empty objects as missing', () => {
    const partial = {
      id: 'a@b.c',
      info: {},
      journeys: [],
      skills: [{}],
      education: [{}],
      links: [{}],
      certs: [{}],
    };
    assert.deepEqual(missingResumeSections(partial), ['info', 'journeys']);
  });
});
