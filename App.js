import React, { useState, useEffect } from "react";
import {
View,
Text,
TextInput,
TouchableOpacity,
FlatList,
StyleSheet,
Switch
} from "react-native";

import { db, auth } from "./firebaseConfig";

import { ref, push, onValue, update, remove } from "firebase/database";

import {
signInWithEmailAndPassword,
createUserWithEmailAndPassword,
onAuthStateChanged,
signOut
} from "firebase/auth";

export default function App(){

const [user,setUser] = useState(null);

const [email,setEmail] = useState("");
const [password,setPassword] = useState("");

const [tasks,setTasks] = useState([]);
const [newTask,setNewTask] = useState("");

const [editId,setEditId] = useState(null);
const [editText,setEditText] = useState("");

const [dark,setDark] = useState(false);

const theme = dark ? darkTheme : lightTheme;

useEffect(()=>{

const unsubscribe = onAuthStateChanged(auth,(u)=>{
setUser(u);
});

return unsubscribe;

},[]);

useEffect(()=>{

if(!user) return;

const tasksRef = ref(db,`tasks/${user.uid}`);

return onValue(tasksRef,(snapshot)=>{

const data = snapshot.val();

if(data){

const list = Object.keys(data).map(id=>({
id,
...data[id]
}));

setTasks(list);

}else{

setTasks([]);

}

});

},[user]);

const login = async()=>{
try{
await signInWithEmailAndPassword(auth,email,password);
}catch{
alert("Erro no login");
}
};

const register = async()=>{
try{
await createUserWithEmailAndPassword(auth,email,password);
}catch{
alert("Erro ao registrar");
}
};

const logout = ()=>{
signOut(auth);
};

const createTask = ()=>{

if(!newTask) return;

push(ref(db,`tasks/${user.uid}`),{
title:newTask,
completed:false
});

setNewTask("");

};

const toggleComplete = (id,status)=>{

update(ref(db,`tasks/${user.uid}/${id}`),{
completed:!status
});

};

const renameTask = (id)=>{

update(ref(db,`tasks/${user.uid}/${id}`),{
title:editText
});

setEditId(null);
setEditText("");

};

const deleteTask = (id)=>{
remove(ref(db,`tasks/${user.uid}/${id}`));
};

if(!user){

return(

<View style={[styles.container,{backgroundColor:theme.bg}]}>

<Text style={[styles.title,{color:theme.text}]}>Login</Text>

<TextInput
placeholder="Email"
placeholderTextColor="#888"
style={[styles.input,{backgroundColor:theme.card,color:theme.text}]}
value={email}
onChangeText={setEmail}
/>

<TextInput
placeholder="Senha"
placeholderTextColor="#888"
secureTextEntry
style={[styles.input,{backgroundColor:theme.card,color:theme.text}]}
value={password}
onChangeText={setPassword}
/>

<TouchableOpacity style={styles.button} onPress={login}>
<Text style={styles.buttonText}>Entrar</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.secondary} onPress={register}>
<Text style={{color:theme.text}}>Criar conta</Text>
</TouchableOpacity>

</View>

);

}

return(

<View style={[styles.container,{backgroundColor:theme.bg}]}>

<View style={styles.header}>

<Text style={[styles.title,{color:theme.text}]}>Minhas Tarefas</Text>

<View style={{flexDirection:"row",alignItems:"center"}}>

<Switch
value={dark}
onValueChange={setDark}
/>

<TouchableOpacity onPress={logout}>
<Text style={{color:"red",marginLeft:10}}>Sair</Text>
</TouchableOpacity>

</View>

</View>

<TextInput
placeholder="Nova tarefa..."
placeholderTextColor="#888"
style={[styles.input,{backgroundColor:theme.card,color:theme.text}]}
value={newTask}
onChangeText={setNewTask}
/>

<FlatList
data={tasks}
keyExtractor={(item)=>item.id}
renderItem={({item})=>(

<View style={[styles.task,{backgroundColor:theme.card}]}>

{editId===item.id?(
<>
<TextInput
style={[styles.input,{backgroundColor:theme.bg,color:theme.text}]}
value={editText}
onChangeText={setEditText}
/>

<TouchableOpacity
style={styles.smallButton}
onPress={()=>renameTask(item.id)}
>
<Text style={styles.buttonText}>Salvar</Text>
</TouchableOpacity>
</>
):(
<>

<Text
style={[
styles.taskText,
{color:theme.text},
item.completed && styles.completed
]}
>
{item.title}
</Text>

<View style={styles.actions}>

<TouchableOpacity
style={styles.complete}
onPress={()=>toggleComplete(item.id,item.completed)}
>
<Text>✔</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.edit}
onPress={()=>{
setEditId(item.id);
setEditText(item.title);
}}
>
<Text>✏</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.delete}
onPress={()=>deleteTask(item.id)}
>
<Text style={{color:"white"}}>✕</Text>
</TouchableOpacity>

</View>

</>
)}

</View>

)}
/>

<TouchableOpacity
style={styles.fab}
onPress={createTask}
>
<Text style={styles.fabText}>+</Text>
</TouchableOpacity>

</View>

);

}

const lightTheme={
bg:"#f4f6fb",
card:"#ffffff",
text:"#111"
};

const darkTheme={
bg:"#121212",
card:"#1e1e1e",
text:"#ffffff"
};

const styles = StyleSheet.create({

container:{
flex:1,
padding:20
},

header:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center",
marginBottom:20
},

title:{
fontSize:28,
fontWeight:"bold"
},

input:{
padding:12,
borderRadius:10,
marginBottom:10
},

button:{
backgroundColor:"#6366f1",
padding:12,
borderRadius:10,
alignItems:"center",
marginBottom:10
},

smallButton:{
backgroundColor:"#6366f1",
padding:8,
borderRadius:8,
marginTop:5
},

buttonText:{
color:"white",
fontWeight:"bold"
},

secondary:{
alignItems:"center",
marginTop:10
},

task:{
padding:15,
borderRadius:12,
marginBottom:10,
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center"
},

taskText:{
fontSize:16
},

completed:{
textDecorationLine:"line-through",
opacity:0.5
},

actions:{
flexDirection:"row",
gap:8
},

complete:{
backgroundColor:"#22c55e",
padding:8,
borderRadius:6
},

edit:{
backgroundColor:"#facc15",
padding:8,
borderRadius:6
},

delete:{
backgroundColor:"#ef4444",
padding:8,
borderRadius:6
},

fab:{
position:"absolute",
bottom:30,
right:30,
backgroundColor:"#6366f1",
width:60,
height:60,
borderRadius:30,
justifyContent:"center",
alignItems:"center",
elevation:5
},

fabText:{
color:"white",
fontSize:30
}

});