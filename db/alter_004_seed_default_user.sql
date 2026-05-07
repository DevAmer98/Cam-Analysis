insert into users (username, password_hash, role)
values
  (
    'Admin',
    'pbkdf2$120000$f5a0a9608073d7587a58fa28bbb797e4$bbf9cf2120db530e430709d8b1024fd1ef41f552b1217a46f39ac601fd8210b9',
    'admin'
  ),
  (
    'User',
    'pbkdf2$120000$9ac037c9787a0295cc92130a48b45438$c91e90119c68062d16690f667fd6a461f3a35dc1a5d3e5a32ae4b6d465060b97',
    'user'
  )
on conflict (username)
do update set
  password_hash = excluded.password_hash,
  role = excluded.role;
