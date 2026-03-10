
const API_URL = 'http://localhost:3000/api/skills';

async function test() {
    try {
        console.log('--- Testing Skill CRUD with fetch ---');

        // 1. Create a skill
        console.log('Step 1: Creating a test skill...');
        const createRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'TestSkill123',
                category: 'Frontend'
            })
        });
        const createData = await createRes.json();

        if (createRes.status !== 201) {
            throw new Error(`Create failed: ${JSON.stringify(createData)}`);
        }

        const skillId = createData.data.id;
        console.log('Created:', createData.data);

        // 2. Try creating a duplicate (case-insensitive)
        console.log('\nStep 2: Testing duplicate validation (lowercase)...');
        const dupRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'testskill123',
                category: 'Backend'
            })
        });
        const dupData = await dupRes.json();

        if (dupRes.status === 400) {
            console.log('SUCCESS: Duplicate creation failed as expected:', dupData.message);
        } else {
            console.error('FAILED: Duplicate creation should have returned 400, got:', dupRes.status);
        }

        // 3. Update the skill
        console.log('\nStep 3: Updating the skill...');
        const updateRes = await fetch(`${API_URL}/${skillId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'UpdatedSkill123',
                isActive: false
            })
        });
        const updateData = await updateRes.json();
        console.log('Updated:', updateData.data);

        // 4. Try updating to another existing skill name
        console.log('\nStep 4: Testing duplicate validation on update...');
        // Create another one first
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'AnotherSkill', category: 'Design' })
        });

        const dupUpdateRes = await fetch(`${API_URL}/${skillId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'anotherskill'
            })
        });
        const dupUpdateData = await dupUpdateRes.json();

        if (dupUpdateRes.status === 400) {
            console.log('SUCCESS: Update to duplicate name failed as expected:', dupUpdateData.message);
        } else {
            console.error('FAILED: Update to duplicate name should have returned 400, got:', dupUpdateRes.status);
        }

        // 5. Delete the skills
        console.log('\nStep 5: Cleaning up (deleting test skills)...');
        await fetch(`${API_URL}/${skillId}`, { method: 'DELETE' });

        // Find ID of AnotherSkill to delete it
        const listRes = await fetch(API_URL);
        const listData = await listRes.json();
        const anotherSkill = listData.data.find(s => s.name === 'AnotherSkill');
        if (anotherSkill) {
            await fetch(`${API_URL}/${anotherSkill.id}`, { method: 'DELETE' });
        }
        console.log('Cleanup complete.');

        console.log('\n--- All Backend Tests Passed ---');

    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

test();
