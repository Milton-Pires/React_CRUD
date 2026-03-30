import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  Switch, Image, ActivityIndicator, KeyboardAvoidingView, Platform
} from "react-native";

import { db, auth, storage, remoteConfig } from "./firebaseConfig";
import { ref, push, onValue, update, remove } from "firebase/database";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "firebase/auth";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from 'expo-image-picker';
import { Alert } from "react-native"; // Você usou Alert.alert() mas não importou
import { fetchAndActivate, getBoolean } from "firebase/remote-config"; 

const lightTheme = { bg: "#f4f6fb", card: "#ffffff", text: "#111" };
const darkTheme = { bg: "#121212", card: "#1e1e1e", text: "#ffffff" };

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [dark, setDark] = useState(false);
  
  const [imageUri, setImageUri] = useState(null);
  const [imageDims, setImageDims] = useState({ width: 1, height: 1 });
  const [loading, setLoading] = useState(false);
  const [isUploadEnabled, setIsUploadEnabled] = useState(true); 

  const theme = dark ? darkTheme : lightTheme;

  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));

  // 2. Busca a Flag imediatamente ao abrir o app
  const syncRemoteConfig = async () => {
    try {
      // Força a ativação dos valores mais recentes
      await fetchAndActivate(remoteConfig);
      const status = getBoolean(remoteConfig, "enable_image_upload");
      console.log("Valor da Flag no Firebase:", status);
      setIsUploadEnabled(status);
    } catch (err) {
      console.error("Erro ao sincronizar Remote Config:", err);
    }
  };

  syncRemoteConfig();
  return unsubscribe;
}, []);

  useEffect(() => {
    if (!user) return;
    const tasksRef = ref(db, `tasks/${user.uid}`);
    return onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(id => ({ id, ...data[id] }));
        setTasks(list);
      } else { setTasks([]); }
    });
  }, [user]);

  const login = async () => {
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch { alert("Erro no login"); }
  };

  const register = async () => {
    try { await createUserWithEmailAndPassword(auth, email, password); } 
    catch { alert("Erro ao registrar"); }
  };

  const logout = () => signOut(auth);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageDims({ 
        width: result.assets[0].width, 
        height: result.assets[0].height 
      });
    }
  };

  const createTask = async () => {
    if (!newTask) return;
    setLoading(true);
    let url = null;
    let finalAspectRatio = 1;

    // Só tenta upload se a Feature Flag permitir e houver imagem
    if (imageUri && isUploadEnabled) {
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        // Verificação de segurança de tamanho (5MB)
        if (blob.size > 5 * 1024 * 1024) {
          Alert.alert("Erro", "A imagem é muito grande (Máx 5MB)");
          setLoading(false);
          return;
        }

        const filename = `${Date.now()}.jpg`;
        const storageRef = sRef(storage, `images/${user.uid}/${filename}`);
        await uploadBytes(storageRef, blob);
        url = await getDownloadURL(storageRef);
        finalAspectRatio = imageDims.width / imageDims.height;
      } catch (e) { 
        console.log(e);
        Alert.alert("Erro", "Falha no upload da imagem.");
      }
    }

    push(ref(db, `tasks/${user.uid}`), {
      title: newTask,
      completed: false,
      imageUrl: url,
      aspectRatio: finalAspectRatio
    });

    setNewTask("");
    setImageUri(null);
    setLoading(false);
  };

  const toggleComplete = (id, status) => {
    update(ref(db, `tasks/${user.uid}/${id}`), { completed: !status });
  };

  const renameTask = (id) => {
    if(!editText) return setEditId(null);
    update(ref(db, `tasks/${user.uid}/${id}`), { title: editText });
    setEditId(null);
    setEditText("");
  };

  const deleteTask = (id) => remove(ref(db, `tasks/${user.uid}/${id}`));

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center' }]}>
        <Text style={[styles.title, { color: theme.text, textAlign: 'center', marginBottom: 30 }]}>Login</Text>
        <TextInput
          placeholder="Email" placeholderTextColor="#888"
          style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
          value={email} onChangeText={setEmail}
        />
        <TextInput
          placeholder="Senha" placeholderTextColor="#888" secureTextEntry
          style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
          value={password} onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.button} onPress={login}>
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={register}>
          <Text style={{ color: theme.text }}>Criar conta</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Minhas Tarefas</Text>
        <View style={styles.row}>
          <Switch value={dark} onValueChange={setDark} />
          <TouchableOpacity onPress={logout}>
            <Text style={{ color: "#ef4444", marginLeft: 10, fontWeight: 'bold' }}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.row}>
        <TextInput
          placeholder="Nova tarefa..." placeholderTextColor="#888"
          style={[styles.input, { flex: 1, backgroundColor: theme.card, color: theme.text }]}
          value={newTask} onChangeText={setNewTask}
        />
        {/* Renderização Condicional via Feature Flag */}
        {isUploadEnabled && (
          <TouchableOpacity onPress={pickImage} style={styles.imageIcon}>
            <Text style={{ fontSize: 24 }}>{imageUri ? "✅" : "📷"}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={[styles.task, { backgroundColor: theme.card }]}>
            {editId === item.id ? (
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.input, { flex: 1, color: theme.text, marginBottom: 0 }]}
                  value={editText} onChangeText={setEditText} autoFocus
                />
                <TouchableOpacity style={styles.smallButton} onPress={() => renameTask(item.id)}>
                  <Text style={styles.buttonText}>OK</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.taskText, 
                    { color: theme.text },
                    item.completed && styles.completed
                  ]}>
                    {item.title}
                  </Text>
                  {item.imageUrl && (
                    <Image 
                      source={{ uri: item.imageUrl }} 
                      // O segredo está no style abaixo: maxWidth e width: '100%'
                      style={[styles.taskImage, { aspectRatio: item.aspectRatio || 1 }]} 
                    />
                  )}
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.complete} onPress={() => toggleComplete(item.id, item.completed)}>
                    <Text style={{ color: 'white' }}>✔</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.edit} onPress={() => { setEditId(item.id); setEditText(item.title); }}>
                    <Text style={{ color: 'white' }}>✏</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delete} onPress={() => deleteTask(item.id)}>
                    <Text style={{ color: "white" }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={createTask} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.fabText}>+</Text>}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "bold" },
  row: { flexDirection: 'row', alignItems: 'center' },
  editRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  imageIcon: { marginLeft: 10, marginBottom: 10 },
  input: { padding: 12, borderRadius: 10, marginBottom: 10 },
  button: { backgroundColor: "#6366f1", padding: 12, borderRadius: 10, alignItems: "center", marginBottom: 10 },
  smallButton: { backgroundColor: "#6366f1", padding: 10, borderRadius: 8, marginLeft: 10 },
  buttonText: { color: "white", fontWeight: "bold" },
  secondary: { alignItems: "center", marginTop: 10 },
  task: { padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: "row", alignItems: "flex-start", minHeight: 60 },
  taskText: { fontSize: 16, fontWeight: '500' },
  taskImage: { 
    width: '100%', 
    maxWidth: 150, // 👈 Ajuste este valor para controlar o tamanho máximo (ex: 150px)
    borderRadius: 8, 
    marginTop: 10,
    backgroundColor: '#eee',
    resizeMode: 'contain' // 👈 Garante que a imagem caiba inteira no espaço
  },
  completed: { textDecorationLine: "line-through", opacity: 0.5 },
  actions: { flexDirection: "row", gap: 8, marginLeft: 10, marginTop: 5 },
  complete: { backgroundColor: "#22c55e", padding: 8, borderRadius: 6 },
  edit: { backgroundColor: "#facc15", padding: 8, borderRadius: 6 },
  delete: { backgroundColor: "#ef4444", padding: 8, borderRadius: 6 },
  fab: { position: "absolute", bottom: 30, right: 30, backgroundColor: "#6366f1", width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 5 },
  fabText: { color: "white", fontSize: 30 }
});
