require('../../src/alias-bootstrap');

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
    normalizeCustomQuestions,
    customQuestionsEqual,
    extractAddressFields,
    normalizeAnswers,
    sanitizeRichDescription,
} = require('@/modules/events/application/helpers/event-builder');

function run() {
    const created = normalizeCustomQuestions([
        {
            questionText: 'Dietary requirements',
            questionType: 'text',
            isRequired: false,
        },
        {
            questionText: 'Preferred session',
            questionType: 'single_choice',
            isRequired: true,
            options: ['Morning', 'Evening'],
        },
    ]);

    assert.strictEqual(created.length, 2);
    assert.match(created[0].id, /^eq_/);
    assert.match(created[1].id, /^eq_/);
    assert.notStrictEqual(created[0].id, created[1].id);

    const updated = normalizeCustomQuestions(
        created.map((question) => ({ ...question })),
        created
    );
    assert.strictEqual(customQuestionsEqual(created, updated), true);

    const reordered = [updated[1], updated[0]];
    assert.strictEqual(customQuestionsEqual(created, reordered), false);

    const address = extractAddressFields({
        addressDetails: {
            street: '12 Nguyen Hue',
            ward: 'Ben Nghe',
            district: 'District 1',
            city: 'Ho Chi Minh City',
            provinceCode: '79',
            districtCode: '760',
            wardCode: '26740',
        },
    });
    assert.deepStrictEqual(address, {
        provinceCode: '79',
        provinceName: 'Ho Chi Minh City',
        districtCode: '760',
        districtName: 'District 1',
        wardCode: '26740',
        wardName: 'Ben Nghe',
        streetAddress: '12 Nguyen Hue',
    });

    const answers = normalizeAnswers([
        {
            name: 'Buyer One',
            email: 'BUYER@example.com',
            answers: {
                [created[1].id]: 'Morning',
            },
        },
    ], created);
    assert.match(answers.attendees[0].id, /^att_/);
    assert.strictEqual(answers.attendees[0].email, 'buyer@example.com');
    assert.strictEqual(answers.attendees[0].answers[created[1].id], 'Morning');
    assert.strictEqual(answers.questionSnapshot[1].id, created[1].id);

    assert.strictEqual(
        sanitizeRichDescription('<script>alert(1)</script>[Unsafe](javascript:alert(1)) ![Image](https://cdn.example/image.png)'),
        'alert(1)[Unsafe](#) ![Image](https://cdn.example/image.png)'
    );

    assert.throws(
        () => normalizeAnswers([{ answers: { [created[1].id]: 'Invalid' } }], created),
        /Invalid choice/
    );

    const migration = fs.readFileSync(
        path.resolve(__dirname, '../../db/migrations/073_event_builder_address_questions.sql'),
        'utf8'
    );
    assert.match(migration, /CREATE TABLE IF NOT EXISTS event_custom_questions/);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS order_attendees/);
    assert.match(migration, /enforce_private_event_visibility/);
    assert.match(migration, /is_private BOOLEAN NOT NULL DEFAULT false/);

    const routes = fs.readFileSync(
        path.resolve(__dirname, '../../src/modules/events/api/routes.js'),
        'utf8'
    );
    assert.match(routes, /\/vietnam-locations/);
    assert.match(routes, /\/:eventId\/orders\/:orderId\/attendees/);

    console.log('Phase 07 event builder smoke passed.');
}

run();
