db = db.getSiblingDB('inter_iit');

if (db.getCollection('users').countDocuments() === 0) {
    db.createCollection('users');
    db.users.insertOne({
        'email': 'admin@isro.gov.in',
        'password': '', // You might want to hash a default password here using a script or set it manually later
        'role': 2,
        'isWhitelisted': true
    });
    print('SUCCESS: Initial admin user created.');
} else {
    print('INFO: Users collection already exists.');
}
