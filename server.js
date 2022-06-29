import express, { application } from 'express';
import pkg from 'nodemon';
const { restart } = pkg;
import bcrypt from 'bcrypt-nodejs';
import cors from 'cors';
import knex from 'knex'


const db = knex({
    client: 'pg',
    connection: {
        host : '127.0.0.1',
        port : 5432,
        user : 'postgres',
        password : 'test',
        database : 'smart-brain'
    }
  });


// db.select('*').from('users').then(data => {
//     console.log(data)
// })


const app = express();
app.use(express.json());
app.use(cors())

app.get('/', (req, res)=>{
    res.send('Connection succeeded')
})


app.post('/signin', (req, res) => {
    const {email, password} = req.body
    if (!email || !password) {
        return res.status(400).json('incorrect form submission')
    }
    db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
        const isValid = bcrypt.compareSync(password, data[0].hash);
        // console.log(isValid)
        if (isValid) {
            return db.select().from('users')
            .where('email', '=', email)
            .then(user => {
                // console.log(user);
                res.json(user[0])
            })
            .catch(err => res.status(400).json("Unable to get user"))
        } else {
            res.status(400).json("Wrong login credentials!")
        }
   })
   .catch(err => res.status(400).json("Wrong login credentials!"))
})

app.post('/register', (req, res) => {
    const {email, name, password} = req.body;
    if (!email || !name || !password) {
        return res.status(400).json('incorrect form submission')
    }
    const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
            .returning('*')
            .insert({
                // [0] because it is an array being returned, so you want the first (and only) object
                email: loginEmail[0].email,
                name: name,
                joined: new Date()
            }).then(user => {
                res.json(user[0]);
            })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => res.status(400).json("Unable to register"))
    });


app.get('/profile/:id', (req,res)=>{
    const {id} = req.params;
    db.select('*').from('users')
    .where({id: id})
    .then(user => {
        console.log(user)
        if (user.length) {
            res.json(user[0])
    } else {
        res.status(400).json("Not found!")
    }})
    .catch(err => res.status(400).json("Error finding user!"))
})


app.put('/image', (req,res) =>{
    const {id} = req.body;
    db('users').where('id', '=', id)
    .increment(
        'entries', 1
    )
    .returning('entries')
    .then(entries => {
        res.json(entries[0].entries)
    })
    .catch(err => res.status(400).json("Unable to retrieve entries"))
})

const PORT = process.env.PORT

app.listen(PORT || 3000, ()=> {
    console.log(`app is running on port ${PORT}`)
})

console.log(PORT)