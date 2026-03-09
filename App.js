import React, { useState, useEffect } from "react";
import { db } from "./firebaseConfig";
import { ref, push, onValue, update, remove } from "firebase/database";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [editId, setEditId] = useState(null); // ID da tarefa sendo editada
  const [editText, setEditText] = useState(""); // Novo texto para a tarefa

  useEffect(() => {
    const tasksRef = ref(db, 'tasks');
    return onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(id => ({ id, ...data[id] }));
        setTasks(list);
      } else { setTasks([]); }
    });
  }, []);

  const createTask = () => {
    if (!newTask) return;
    push(ref(db, 'tasks'), { title: newTask, completed: false });
    setNewTask("");
  };

  // R - RENAME (Função de Atualizar Nome)
  const renameTask = (id) => {
    if (!editText) return;
    const taskRef = ref(db, `tasks/${id}`);
    update(taskRef, { title: editText });
    setEditId(null); // Sai do modo de edição
    setEditText("");
  };

  const toggleComplete = (id, currentStatus) => {
    update(ref(db, `tasks/${id}`), { completed: !currentStatus });
  };

  const deleteTask = (id) => {
    remove(ref(db, `tasks/${id}`));
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>CRUD Realtime Database</h1>
      
      <input 
        value={newTask} 
        onChange={(e) => setNewTask(e.target.value)} 
        placeholder="Nova tarefa..."
      />
      <button onClick={createTask}>Adicionar</button>

      <ul>
        {tasks.map((t) => (
          <li key={t.id} style={{ marginBottom: "8px" }}>
            {editId === t.id ? (
              <>
                <input 
                  value={editText} 
                  onChange={(e) => setEditText(e.target.value)} 
                />
                <button onClick={() => renameTask(t.id)}>Salvar</button>
                <button onClick={() => setEditId(null)}>Cancelar</button>
              </>
            ) : (
              <>
                <span style={{ textDecoration: t.completed ? "line-through" : "none", marginRight: "10px" }}>
                  {t.title}
                </span>
                <button onClick={() => toggleComplete(t.id, t.completed)}>
                  {t.completed ? "Desmarcar" : "Concluir"}
                </button>
                <button onClick={() => { setEditId(t.id); setEditText(t.title); }}>
                  Renomear
                </button>
                <button onClick={() => deleteTask(t.id)}>Excluir</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;

