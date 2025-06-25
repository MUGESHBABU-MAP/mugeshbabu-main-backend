const xlsx = require('xlsx')
const fs = require('fs')

const headers = [
    [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'address1.street',
        'address1.city',
        'address1.state',
        'address1.pincode',
        'address2.street',
        'address2.city',
        'address2.state',
        'address2.pincode',
    ]
]

const worksheet = xlsx.utils.aoa_to_sheet(headers)
const workbook = xlsx.utils.book_new()
xlsx.utils.book_append_sheet(workbook, worksheet, 'Users')

xlsx.writeFile(workbook, 'user-import-template.xlsx')
console.log('✅ Template created: user-import-template.xlsx')