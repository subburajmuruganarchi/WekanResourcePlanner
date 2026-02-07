const http = require('http');

const request = (method, path, data) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
};

const fs = require('fs');

async function verify() {
    const logParams = [];
    const log = (...args) => {
        console.log(...args);
        logParams.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
    };

    try {
        log("Fetching dependencies...");
        const empRes = await request('GET', '/employees');
        const skillRes = await request('GET', '/skills');
        const roleRes = await request('GET', '/roles');

        const ownerId = empRes.body.data[0].id;
        const skillId = skillRes.body.data[0].id;
        const roleId = roleRes.body.data[0].id;

        log(`Dependencies: Owner=${ownerId}, Skill=${skillId}, Role=${roleId}`);

        const newProject = {
            name: "Verification Project " + Date.now(),
            code: "VER-" + Math.floor(Math.random() * 1000),
            status: "Active",
            priority: "High",
            ownerId: ownerId,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
            billingType: "Billable",
            deliveryModel: "Fixed",
            skillRequirements: [
                {
                    skillId: skillId,
                    minSkillLevel: "Expert",
                    requiredHeadcount: 2,
                    requiredDays: 20,
                    roleId: roleId
                }
            ],
            roleEfforts: [
                {
                    roleId: roleId,
                    requiredHeadcount: 1,
                    requiredDays: 10,
                    hoursPerDay: 8
                }
            ]
        };

        log("Creating Project...");
        const createRes = await request('POST', '/projects', newProject);
        log("Create Status:", createRes.status);
        log("Create Body:", JSON.stringify(createRes.body, null, 2));

        if (createRes.status !== 201) {
            log("FAILED to create project");
        } else {
            log("SUCCESS: Created project");
            log("Verifying Validation (Duplicate Code)...");
            const dupRes = await request('POST', '/projects', newProject);
            log("Duplicate Status:", dupRes.status);
            if (dupRes.status === 400 || dupRes.status === 500) {
                log("SUCCESS: Duplicate prevented");
            } else {
                log("FAILED: Duplicate allowed or wrong status");
            }
        }

    } catch (err) {
        log("Error:", err);
    } finally {
        fs.writeFileSync('c:/r360/backend/scripts/verify.log', logParams.join('\n'));
    }
}

verify();
