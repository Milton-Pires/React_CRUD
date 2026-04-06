// App.js

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Switch,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";

import { db, auth, storage } from "./firebaseConfig";
import { ref, push, onValue, update, remove } from "firebase/database";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";

import { useFeatureFlags, useIsAdmin } from "./useFeatureFlags";
import AdminScreen from "./AdminScreen";

// ---------------------------------------------------------------------------
// Temas
// ---------------------------------------------------------------------------
const lightTheme = {
  bg: "#f4f6fb",
  card: "#ffffff",
  text: "#111111",
  border: "#e5e7eb",
};

const darkTheme = {
  bg: "#121212",
  card: "#1e1e1e",
  text: "#ffffff",
  border: "#2d2d2d",
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function App() {
  // Auth
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Tarefas
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");

  // UI
  const [dark, setDark] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  // Imagem
  const [imageUri, setImageUri] = useState(null);
  const [imageDims, setImageDims] = useState({ width: 1, height: 1 });

  // Feature Flags — passa o user para só buscar após login
  const { flags } = useFeatureFlags(user);
  const isAdmin = useIsAdmin(user);

  const theme = dark ? darkTheme : lightTheme;

  // -------------------------------------------------------------------------
  // Auth listener
  // -------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return unsubscribe;
  }, []);

  // -------------------------------------------------------------------------
  // Tarefas listener
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    const tasksRef = ref(db, `tasks/${user.uid}`);
    const unsubscribe = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map((id) => ({ id, ...data[id] }));
        setTasks(list);
      } else {
        setTasks([]);
      }
    });

    return unsubscribe;
  }, [user]);

  // -------------------------------------------------------------------------
  // Auth handlers
  // -------------------------------------------------------------------------
  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      Alert.alert("Erro no login", "Verifique seu email e senha.");
    }
  };

  const register = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
      Alert.alert("Erro ao registrar", e.message);
    }
  };

  const logout = () => signOut(auth);

  // -------------------------------------------------------------------------
  // Imagem
  // -------------------------------------------------------------------------
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageDims({
        width: result.assets[0].width,
        height: result.assets[0].height,
      });
    }
  };

  // -------------------------------------------------------------------------
  // CRUD Tarefas
  // -------------------------------------------------------------------------
  const createTask = async () => {
    if (!newTask.trim()) return;
    setLoading(true);

    let url = null;
    let finalAspectRatio = 1;

    if (imageUri && flags.enable_image_upload) {
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();

        if (blob.size > 5 * 1024 * 1024) {
          Alert.alert("Erro", "Imagem muito grande (máx. 5MB).");
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

    await push(ref(db, `tasks/${user.uid}`), {
      title: newTask.trim(),
      completed: false,
      imageUrl: url,
      aspectRatio: finalAspectRatio,
    });

    setNewTask("");
    setImageUri(null);
    setLoading(false);
  };

  const toggleComplete = (id, status) => {
    update(ref(db, `tasks/${user.uid}/${id}`), { completed: !status });
  };

  const renameTask = (id) => {
    if (!editText.trim()) return setEditId(null);
    update(ref(db, `tasks/${user.uid}/${id}`), { title: editText.trim() });
    setEditId(null);
    setEditText("");
  };

  // Corrigido: usa window.confirm no web, Alert.alert no mobile
  const deleteTask = (id) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Tem certeza que deseja excluir esta tarefa?");
      if (confirmed) {
        remove(ref(db, `tasks/${user.uid}/${id}`));
      }
    } else {
      Alert.alert("Excluir", "Tem certeza que deseja excluir esta tarefa?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => remove(ref(db, `tasks/${user.uid}/${id}`)),
        },
      ]);
    }
  };

  // -------------------------------------------------------------------------
  // Tela ADM
  // -------------------------------------------------------------------------
  if (showAdmin) {
    return (
      <AdminScreen
        onClose={() => setShowAdmin(false)}
        theme={theme}
        user={user}
      />
    );
  }

  // -------------------------------------------------------------------------
  // Tela de Login
  // -------------------------------------------------------------------------
  if (!user) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.bg, justifyContent: "center" }]}
      >
        <Text style={[styles.title, { color: theme.text, textAlign: "center", marginBottom: 30 }]}>
          Login
        </Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#888"
          style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Senha"
          placeholderTextColor="#888"
          secureTextEntry
          style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
          value={password}
          onChangeText={setPassword}
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

  // -------------------------------------------------------------------------
  // Tela principal
  // -------------------------------------------------------------------------
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Minhas Tarefas</Text>

        <View style={styles.row}>
          {/* Switch de tema — controlado pela flag enable_dark_mode */}
          {flags.enable_dark_mode && (
            <Switch
              value={dark}
              onValueChange={setDark}
              trackColor={{ true: "#6366f1" }}
            />
          )}

          {/* Botão ADM — visível apenas para admins */}
          {isAdmin && (
            <TouchableOpacity
              onPress={() => setShowAdmin(true)}
              style={styles.adminBtn}
            >
              <Text style={styles.adminBtnText}>⚙️ ADM</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={logout} style={{ marginLeft: 10 }}>
            <Text style={{ color: "#ef4444", fontWeight: "bold" }}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Input de nova tarefa */}
      <View style={styles.row}>
        <TextInput
          placeholder="Nova tarefa..."
          placeholderTextColor="#888"
          style={[styles.input, { flex: 1, backgroundColor: theme.card, color: theme.text }]}
          value={newTask}
          onChangeText={setNewTask}
        />

        {/* Botão de câmera — controlado pela flag enable_image_upload */}
        {flags.enable_image_upload && (
          <TouchableOpacity onPress={pickImage} style={styles.imageIcon}>
            <Text style={{ fontSize: 24 }}>{imageUri ? "✅" : "📷"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de tarefas */}
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
                  value={editText}
                  onChangeText={setEditText}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => renameTask(item.id)}
                >
                  <Text style={styles.buttonText}>OK</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.taskText,
                      { color: theme.text },
                      item.completed && styles.completed,
                    ]}
                  >
                    {item.title}
                  </Text>

                  {item.imageUrl && (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={[styles.taskImage, { aspectRatio: item.aspectRatio || 1 }]}
                    />
                  )}
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.complete}
                    onPress={() => toggleComplete(item.id, item.completed)}
                  >
                    <Text style={{ color: "white" }}>✔</Text>
                  </TouchableOpacity>

                  {/* Botão editar — controlado pela flag enable_edit_task */}
                  {flags.enable_edit_task && (
                    <TouchableOpacity
                      style={styles.edit}
                      onPress={() => {
                        setEditId(item.id);
                        setEditText(item.title);
                      }}
                    >
                      <Text style={{ color: "white" }}>✏</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.delete}
                    onPress={() => deleteTask(item.id)}
                  >
                    <Text style={{ color: "white" }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={createTask} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.fabText}>+</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: "bold" },
  row: { flexDirection: "row", alignItems: "center" },
  editRow: { flex: 1, flexDirection: "row", alignItems: "center" },
  imageIcon: { marginLeft: 10, marginBottom: 10 },
  input: { padding: 12, borderRadius: 10, marginBottom: 10 },
  button: {
    backgroundColor: "#6366f1",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  smallButton: {
    backgroundColor: "#6366f1",
    padding: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  secondary: { alignItems: "center", marginTop: 10 },
  adminBtn: {
    backgroundColor: "#ede9fe",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  adminBtnText: { color: "#6366f1", fontWeight: "bold", fontSize: 13 },
  task: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 60,
  },
  taskText: { fontSize: 16, fontWeight: "500" },
  taskImage: {
    width: "100%",
    maxWidth: 150,
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: "#eee",
    resizeMode: "contain",
  },
  completed: { textDecorationLine: "line-through", opacity: 0.5 },
  actions: { flexDirection: "row", gap: 8, marginLeft: 10, marginTop: 5 },
  complete: { backgroundColor: "#22c55e", padding: 8, borderRadius: 6 },
  edit: { backgroundColor: "#facc15", padding: 8, borderRadius: 6 },
  delete: { backgroundColor: "#ef4444", padding: 8, borderRadius: 6 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#6366f1",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  fabText: { color: "white", fontSize: 30 },
});