/**
 * Seed script.
 * Populates categories, an admin account, and light demo data
 * (idempotent - safe to run multiple times).
 */
const bcrypt = require('bcrypt');
const db = require('../config/database');
const config = require('../config/config');

const CATEGORIES = [
  'Laundry', 'Barbing', 'Hair Styling', 'Cleaning', 'Graphic Design',
  'Photography', 'Videography', 'Coding', 'Assignment Typing', 'Private Tutor',
  'Food Delivery', 'Errands', 'Laptop Repair', 'Phone Repair', 'Printing',
  'CV Writing', 'Event Ushering', 'Others',
];

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function seedCategories() {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)'
  );
  const insertMany = db.transaction((cats) => {
    for (const name of cats) {
      insert.run(name, slugify(name));
    }
  });
  insertMany(CATEGORIES);
  console.log(`[seed] Categories ensured (${CATEGORIES.length}).`);
}

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(config.admin.email);
  if (existing) {
    console.log(`[seed] Admin account already exists: ${config.admin.email}`);
    return existing.id;
  }

  const hash = bcrypt.hashSync(config.admin.password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)'
  ).run(config.admin.email, hash, 'admin');

  db.prepare(
    `INSERT INTO profiles (user_id, full_name, phone, department, faculty, level, bio)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(result.lastInsertRowid, config.admin.name, '08000000000', 'Administration', 'Administration', 'N/A', 'Platform administrator account.');

  console.log(`[seed] Admin account created:`);
  console.log(`       Email: ${config.admin.email}`);
  console.log(`       Password: ${config.admin.password}`);
  return result.lastInsertRowid;
}

function seedDemoUsers() {
  const demoUsers = [
    {
      email: 'chidinma.customer@rsu.edu.ng',
      password: 'Password@123',
      role: 'customer',
      full_name: 'Chidinma Okafor',
      phone: '08012345001',
      department: 'Computer Science',
      faculty: 'Science',
      level: '300',
      bio: 'Busy CS student who outsources chores to focus on coursework.',
      skills: [],
    },
    {
      email: 'emeka.worker@rsu.edu.ng',
      password: 'Password@123',
      role: 'worker',
      full_name: 'Emeka Nwosu',
      phone: '08012345002',
      department: 'Electrical Engineering',
      faculty: 'Engineering',
      level: '400',
      bio: 'Laptop and phone repair specialist. Fast, reliable, affordable.',
      skills: ['Laptop Repair', 'Phone Repair', 'Coding'],
    },
    {
      email: 'amaka.worker@rsu.edu.ng',
      password: 'Password@123',
      role: 'worker',
      full_name: 'Amaka Eze',
      phone: '08012345003',
      department: 'Fine Arts',
      faculty: 'Humanities',
      level: '200',
      bio: 'Graphic designer and photographer. Portfolio available on request.',
      skills: ['Graphic Design', 'Photography', 'Videography'],
    },
  ];

  const userIds = {};

  for (const u of demoUsers) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
    if (existing) {
      userIds[u.email] = existing.id;
      continue;
    }
    const hash = bcrypt.hashSync(u.password, 10);
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)'
    ).run(u.email, hash, u.role);

    db.prepare(
      `INSERT INTO profiles (user_id, full_name, phone, department, faculty, level, bio, skills)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(result.lastInsertRowid, u.full_name, u.phone, u.department, u.faculty, u.level, u.bio, JSON.stringify(u.skills));

    userIds[u.email] = result.lastInsertRowid;
    console.log(`[seed] Demo user created: ${u.email} / ${u.password}`);
  }

  return userIds;
}

function seedDemoTask(userIds) {
  const customerId = userIds['chidinma.customer@rsu.edu.ng'];
  if (!customerId) return;

  const existingTask = db.prepare('SELECT id FROM tasks WHERE customer_id = ?').get(customerId);
  if (existingTask) {
    console.log('[seed] Demo task already exists, skipping.');
    return;
  }

  const category = db.prepare('SELECT id FROM categories WHERE slug = ?').get('laptop-repair');
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);

  db.prepare(
    `INSERT INTO tasks (customer_id, title, description, category_id, budget, deadline, location, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`
  ).run(
    customerId,
    'Fix laptop that won\'t boot',
    'My HP laptop shows a black screen on startup. Needs urgent diagnosis and repair before exams.',
    category.id,
    5000,
    deadline.toISOString(),
    'Hostel Block C, RSU'
  );

  console.log('[seed] Demo task created.');
}

function main() {
  console.log('[seed] Starting seed process...');
  seedCategories();
  seedAdmin();
  const userIds = seedDemoUsers();
  seedDemoTask(userIds);
  console.log('[seed] Done! 🎉');
}

main();
