// Release helper run on the developer's machine, not part of the app.
const token = process.env.LIARA_API_TOKEN;
console.log(token ? 'deploying' : 'set LIARA_API_TOKEN');
