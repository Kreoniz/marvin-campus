import assert from 'node:assert/strict';
import { test } from 'node:test';
import { vucOriginalAvailable, vucSourceDocuments } from './vuc-documents.ts';
import type { VucRef } from './types.ts';

const ref: VucRef = {
  kind: 'vuc',
  id: 'd0123456789ab-p901',
  label: 'ВУЦ 901',
  originalAvailable: true,
};
const sibling: VucRef = { ...ref, id: 'd0123456789ab-p902', label: 'ВУЦ 902' };
const archive: VucRef = { ...ref, id: 'daaaaaaaaaaaa-p901' };

test('download footer deduplicates documents, preserves order and distinct documents with the same platoon', () => {
  assert.deepEqual(
    vucSourceDocuments(
      [
        { selection: ref },
        { selection: { id: 901, label: 'Группа' } },
        { selection: sibling },
        { selection: archive },
        { selection: ref },
      ],
      [ref, sibling, archive],
    ),
    [ref, archive],
  );
  assert.deepEqual(
    vucSourceDocuments([{ selection: ref }, { selection: sibling }], [sibling]),
    [sibling],
  );
  assert.deepEqual(
    vucSourceDocuments([{ selection: { ...ref, id: 'old-legacy-id' } }], [ref]),
    [],
  );
});

test('persisted and old week availability cannot authorize a removed or missing original', () => {
  assert.equal(vucOriginalAvailable(ref, []), false);
  assert.equal(vucOriginalAvailable(archive, [ref]), false);
  assert.equal(
    vucOriginalAvailable(ref, [{ ...ref, originalAvailable: false }]),
    false,
  );
  assert.equal(
    vucOriginalAvailable(ref, [{ ...ref, originalAvailable: undefined }]),
    false,
  );
  assert.equal(vucOriginalAvailable(ref, [ref]), true);
  assert.equal(
    vucOriginalAvailable({ ...ref, originalAvailable: false }, [ref]),
    true,
  );
  assert.equal(
    vucOriginalAvailable({ ...ref, id: '../../file' }, [ref]),
    false,
  );
});
