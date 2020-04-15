<style>
  *{
    margin-left:150px;
    font-family: arial, sans-serif;
  }
table {
  font-family: arial, sans-serif;
  border-collapse: collapse;
  width: 80%;
  margin-left:10%;
}

td, th {
  border: 1px solid #dddddd;
  text-align: left;
  padding: 8px;
}

tr:nth-child(even) {
  background-color: #dddddd;
}

.invalid {background:rgba(255,0,0,.8);}
.valid {background:rgba(0,255,0,.8);}
</style>

<svelte:head><title>{title}</title></svelte:head>

<script>
  export let title;
  import {onMount} from 'svelte';
  let user = {}
  let users = [];
  let state = 'ADD';
  let exist = false;
  let search = '';
  /* $: filteredUser = users.filter(u => u._Username == search); */
  $: filteredUser = users.filter(u => u._Username.indexOf(search) != -1);

  const userGetAll = async () => {
    clearUser();
    let res = await fetch('http://localhost:3000/api/user');
    users = await res.json();
  };

  const userAdd = async () => {
    if(user._Username == '' || user._Password == '')
      return alert(`Please fill out form.`);

    let res = await fetch('http://localhost:3000/api/user', {
      method: 'POST',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify(user),
    });
    let result = await res.json();

    users = [...users, user];

    console.log(`New user ${user._Username} aded.`);
    alert(`New user ${user._Username} aded.`);
    clearUser();

  };
  const userEdit = (u) => {
    state = 'EDIT';
    user = u;
  };
  const userUpdate = async () => {
    let ans = confirm(`Are you sure you want to update ${user._Username}?`);
    if(!ans)
      return alert(`Update cancelled.`);

    let res = await fetch(`http://localhost:3000/api/user/`, {
      method: 'PATCH',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify(user),
    });
    let result = await res.json();

    let index = users.findIndex(u => u.ID == user.ID);
    users[index] = user;
    console.log(`User '${user._Username}' updated!`);
    alert(`User '${user._Username}' updated!`);
    back();
  };
  const userDelete = async () => {
    let ans = confirm(`Are you sure you want to delete '${user._Username}'?`);
    if(!ans)
      return alert(`Deletion cancelled.`);

    let res = await fetch(`http://localhost:3000/api/user/${user.ID}`, {
      method: 'DELETE',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify(user),
    });
    let result = await res.json();

    users = users.filter(u => u.ID != user.ID);
    console.log(`User '${user._Username}' deleted!`);
    alert(`User '${user._Username}' deleted!`);
    clearUser();
  };

  const userExist = async () => {
    let userExist = users.filter(u => u._Username == user._Username);
    if(userExist.length == 0)
      exist = false;
    else
      exist = true;
  };

  const back = () => {
    clearUser();
    state = 'ADD';
  };

  const clearUser = () => {
    user= {
      _Username : '',
      _Password : '',
      StudentNo: '',
      isActive: true,

    }
  };

  onMount(() => userGetAll());
</script>


<h1>USERS</h1>
<form >
  <label for="_Username" id="_Username">Username</label>
  <input type="text" id="_Username" placeholder="Username" bind:value={user._Username} on:input={userExist} class={exist && state=='ADD' ? 'invalid' : 'valid'}>
  <label for="_Password">Password</label>
  <input type="password" id="_Password" placeholder="Password" bind:value={user._Password}>
  <label for="StudentNo">StudentNo</label>
  <input type="text" id="StudentNo" placeholder="StudentNo" bind:value={user.StudentNo}>
    <label for="isActive">Active</label>
    <input type="checkbox" id="isActive" bind:checked={user.isActive}>
    <br>
  {#if state == 'ADD'}
    <button on:click|preventDefault={userAdd}>ADD</button>
  {:else}

    <button on:click|preventDefault={userUpdate}>UPDATE</button>
    <button on:click|preventDefault={userDelete}>DELETE</button>
    <button on:click|preventDefault={back}>BACK</button>
  {/if}
</form>

<ul>
  <li>Username: {user._Username}</li>
  <li>Password: {user._Password}</li>
  <li>Student No: {user.StudentNo}</li>
  <li>isActive: {user.isActive}</li>
  <br>
  <li>COUNT: {users.length}</li>
</ul>

<input type="text" bind:value={search} placeholder="Search by Username">
<table>
  <tr>
    <th>Username</th>
    <th>Password</th>
    <th>Student No</th>
    <th>isActive</th>
    <th>Action</th>
  </tr>
  {#if users.length == 0}
  <tr>
    <th colspan="5"><center>NO DATA</center></th>
  </tr>
  {:else}
    {#each (search == '' ? users : filteredUser) as u}
      <tr>
        <td>{u._Username}</td>
        <td>{u._Password }</td>
        <td>{u.StudentNo == '' ? null : u.StudentNo}</td>
        <td>{u.isActive ? 'true' : 'false'}</td>
        <td><button on:click|preventDefault={userEdit(u)}>EDIT</button></td>
      </tr>
    {/each}
  {/if}
</table>
<h3>X</h3>
