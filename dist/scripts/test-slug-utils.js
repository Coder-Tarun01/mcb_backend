"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const slug_1 = require("../utils/slug");
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}
async function run() {
    console.log('Running slug util tests...');
    const seg = (0, slug_1.toSlugSegment)('Senior Dévelopér, C++/C#');
    assert(seg === 'senior-developr-c-c', `toSlugSegment unexpected: ${seg}`);
    const slugWithLoc = (0, slug_1.buildJobSlug)({
        title: 'Senior Software Engineer',
        company: 'Acme, Inc.',
        location: 'Bengaluru, KA',
        id: 'job_12345'
    });
    assert(slugWithLoc.startsWith('senior-software-engineer-bengaluru-at-acme-inc-'), `slugWithLoc prefix unexpected: ${slugWithLoc}`);
    assert(slugWithLoc.endsWith('-job_12345'), `slugWithLoc suffix unexpected: ${slugWithLoc}`);
    const slugNoLoc = (0, slug_1.buildJobSlug)({
        title: 'Data Scientist',
        company: 'Müller & Sons',
        location: '',
        id: 'ABC123'
    });
    assert(slugNoLoc.startsWith('data-scientist-at-muller-sons-'), `slugNoLoc prefix unexpected: ${slugNoLoc}`);
    assert(slugNoLoc.endsWith('-abc123'), `slugNoLoc lowercase id: ${slugNoLoc}`);
    const extracted1 = (0, slug_1.extractIdFromSlug)('data-scientist-bengaluru-at-acme-xyz123');
    assert(extracted1 === 'xyz123', `extractIdFromSlug failed: ${extracted1}`);
    const extracted2 = (0, slug_1.extractIdFromSlug)('job_987');
    assert(extracted2 === 'job_987', `extractIdFromSlug (id passthrough) failed: ${extracted2}`);
    console.log('✅ All slug util tests passed.');
}
run().catch((e) => {
    console.error('❌ Slug util tests failed:', e);
    process.exit(1);
});
//# sourceMappingURL=test-slug-utils.js.map