import axios from 'axios';

async function testRanking() {
    try {
        const response = await axios.get('http://localhost:3000/api/allocations/rank?projectId=6986cf2db3dc33b7a6dc85f5');
        const data = response.data.data;

        console.log('Ranking Test Results:');
        data.slice(0, 5).forEach((emp: any) => {
            console.log(`Employee: ${emp.name}`);
            console.log(`  Primary Skill: ${emp.primarySkill}`);
            console.log(`  Matching Skills: ${JSON.stringify(emp.matchingSkills)}`);
            console.log(`  Match Score: ${emp.matchScore}`);
            console.log('---');
        });
    } catch (error) {
        console.error('Error fetching ranking:', error);
    }
}

testRanking();
