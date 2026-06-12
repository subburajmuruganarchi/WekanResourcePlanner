
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Employee } from '../src/modules/employees/employee.model';
import { Skill } from '../src/modules/skills/skill.model';
import { EmployeeSkill } from '../src/modules/employees/employee-skill.model';
import { SkillLevel } from '../src/common/types/enums';

dotenv.config({ path: path.join(__dirname, '../.env') });

const SKILL_DATA = [
  { id: "E001", skills: "NodeJS, NestJS, MongoDB, AWS" },
  { id: "E002", skills: "MERN, AWS, Flutter, React Native, Architecture, Rust" },
  { id: "E004", skills: "Mongodb, Java Springboot, Oracle, Python, Nodejs, Nextjs, Devops( AWS & Azure), System Design, MySQL, NLP, TensorFlow, PyTorch" },
  { id: "E005", skills: "NodeJS, MongoDB, AWS, Flutter, Android, Python, MERN, Java, Springboot, Kafka" },
  { id: "E006", skills: "Java, Kafka, MongoDB, Python, Oracle, Reactnative, MERN, AWS, PHP, RabbitMQ" },
  { id: "E009", skills: "NestJS, Typescript, Python, React, Next, MongoDB, MySQL, Redis, Kafka, Docker, Kubernetes, CI/CD, AWS" },
  { id: "E010", skills: "ReactJS, NodeJS, MongoDB, NestJS, AWS, MERN" },
  { id: "E013", skills: "MERN, Rust, Tokio, Python, MongoDB, AWS" },
  { id: "E015", skills: "ReactJS, NodeJS, MongoDB, NestJS" },
  { id: "E016", skills: "Java , Oracle, MongoDB, Kafka, Springboot" },
  { id: "E017", skills: "Java , Oracle, Springboot, AWS, Kafka" },
  { id: "E018", skills: "Node.js, Nest.js, MongoDB" },
  { id: "E019", skills: "Java, Oracle, MongoDB, Kafka, Springboot, Microservices" },
  { id: "E020", skills: "React, Next.js, Java" },
  { id: "E021", skills: "React, Next, Node, GraphQl, React Native (Expo), Langchain." },
  { id: "E022", skills: "ReactJS, Javascript, EmberJS old version 3, Python Basics" },
  { id: "E023", skills: "React js (Primary), Vue js, Node js, Express js, Mongodb, SQL, Next js, Nuxt js, Figma, JavaScript, typeScript, Java" },
  { id: "E024", skills: "MongoDB DBA" },
  { id: "E025", skills: "Mobile, IOS, Android, Swift" },
  { id: "E026", skills: "Android, Ditto, IOS, Swift, Java, MongoDB, Reactnative, Kotlin, Sqlite" },
  { id: "E027", skills: "Android, Flutter, Java, Kotlin" },
  { id: "E029", skills: "React Native" },
  { id: "E030", skills: "React Native , Flutter , Andriod , IOS" },
  { id: "E032", skills: "React Native , Andriod , IOS, Flutter" },
  { id: "E034", skills: "Automation, Java, Selenium" },
  { id: "E035", skills: "Appium,Manual, Selenium, JMeter" },
  { id: "E037", skills: "MERN, prompt engineering." },
  { id: "E038", skills: "IOS Development, Swift, Objective-C, UIKit, SwiftUI, IOS Architecture (MVVM, Clean Architecture)" },
  { id: "E039", skills: "NodeJS, MongoDB, AWS, Python, Golang" },
  { id: "E042", skills: "MongoDB DBA" },
  { id: "E043", skills: "ReactJS, NodeJS, MongoDB, Python, NestJS, AWS, GoLang, Tyepscript, Azure, GCP" },
  { id: "E045", skills: "Python, ReactJS" },
  { id: "E046", skills: "Python, NodeJS, Java, AWS, Azure" },
  { id: "E047", skills: "Java" },
  { id: "E048", skills: "ReactJS, NodeJS, MongoDB, Python, NestJS, AWS" },
  { id: "E049", skills: "J-meter, automation test, manual testing, play right, load testing, pen testing" }
];

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('Connected to MongoDB');

        for (const data of SKILL_DATA) {
            const employee = await Employee.findOne({ employee_code: data.id });
            if (!employee) {
                console.log(`Employee with code ${data.id} not found. Skipping.`);
                continue;
            }

            console.log(`Processing skills for ${employee.first_name} ${employee.last_name} (${data.id})...`);

            const skillNames = data.skills.split(',').map(s => s.trim().replace(/\.$/, '')).filter(s => s.length > 0);

            for (const skillName of skillNames) {
                // 1. Ensure Skill Master exists
                let skill = await Skill.findOne({ name: new RegExp('^' + skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
                if (!skill) {
                    skill = await Skill.create({
                        name: skillName,
                        category: 'Technical',
                        is_active: true
                    });
                    console.log(`Created new master Skill: ${skillName}`);
                }

                // 2. Link to Employee
                const exists = await EmployeeSkill.findOne({ employee_id: employee._id, skill_id: skill._id });
                if (!exists) {
                    await EmployeeSkill.create({
                        employee_id: employee._id,
                        skill_id: skill._id,
                        skill_level: SkillLevel.INTERMEDIATE,
                        experience_years: 2,
                        is_primary: false
                    });
                    console.log(`Linked ${skillName} to ${employee.first_name}`);
                }
            }
        }

        console.log('Skill migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Skill migration failed:', error);
        process.exit(1);
    }
}

migrate();
