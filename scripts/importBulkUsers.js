const xlsx = require('xlsx')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid')
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
console.log('✅ Loaded DB URI:', process.env.MONGODB_URI);

// Connect to DB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

/**
 * Parse multiple addresses from a flat user object
 */
function parseAddresses(user) {
    const addresses = []
    let index = 1

    while (user[`address${index}.street`] || user[`address${index}.city`]) {
        addresses.push({
            street: user[`address${index}.street`] || '',
            city: user[`address${index}.city`] || '',
            state: user[`address${index}.state`] || '',
            pincode: user[`address${index}.pincode`] || '',
        })
        index++
    }

    return addresses.length > 0 ? addresses : []
}

/**
 * Import users from Excel file
 */
async function importUsersFromExcel(filePath) {
    const workbook = xlsx.readFile(filePath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const users = xlsx.utils.sheet_to_json(sheet)

    for (const user of users) {
        try {
            const email = user.email?.trim()
            if (!email) {
                console.warn(`⚠️ Skipped entry with missing email`)
                continue
            }

            const existingUser = await User.findOne({ email })
            if (existingUser) {
                console.warn(`⚠️ Skipped (duplicate): ${email}`)
                continue
            }

            const hashedPassword = await bcrypt.hash(user.password || 'default123', 10)

            await User.create({
                name: user.name,
                email,
                username: user.username || email.split('@')[0],
                phone: user.phone,
                password: hashedPassword,
                role: user.role || 'customer',
                isActive: true,
                address: parseAddresses(user),
                userId: uuidv4(),
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            console.log(`✅ Imported: ${email}`)
        } catch (err) {
            console.error(`❌ Failed: ${user.email} - ${err.message}`)
        }
    }

    mongoose.connection.close()
}

// Usage
importUsersFromExcel('./user-import-template.xlsx')