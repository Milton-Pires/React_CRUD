// AdminScreen.js
//
// Tela de administração de Feature Flags.
// Exibida apenas para usuários marcados como ADM em /admins/<uid> no Firebase.
//
// Para adicionar um ADM:
//  1. Abra o console do Firebase → Realtime Database
//  2. Adicione o nó:  /admins/<UID_DO_USUARIO> : true
//
// Para adicionar uma nova flag: inclua uma entrada em FLAG_CONFIG abaixo
// e crie o mesmo key em /feature_flags no banco.

import React, { useState } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { useFeatureFlags } from "./useFeatureFlags";

// Mapa de chaves para exibição amigável na tela
const FLAG_CONFIG = {
  enable_image_upload: {
    label: "Upload de Imagens",
    description: "Permite que usuários anexem fotos às tarefas",
    icon: "📷",
  },
  enable_edit_task: {
    label: "Edição de Tarefas",
    description: "Habilita o botão de renomear tarefas existentes",
    icon: "✏️",
  },
  enable_dark_mode: {
    label: "Modo Escuro",
    description: "Exibe o switch de tema escuro no header",
    icon: "🌙",
  },
};

export default function AdminScreen({ onClose, theme, user }) {
  // Passa o user para o hook para evitar PERMISSION_DENIED
  const { flags, setFlag, loading } = useFeatureFlags(user);
  const [updating, setUpdating] = useState(null);

  const handleToggle = async (key, currentValue) => {
    setUpdating(key);
    try {
      await setFlag(key, !currentValue);
    } catch {
      Alert.alert(
        "Erro",
        "Não foi possível atualizar a flag. Verifique suas permissões de ADM."
      );
    } finally {
      setUpdating(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border || "#e5e7eb" }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>⚙️ Painel ADM</Text>
          <Text style={[styles.subtitle, { color: theme.text }]}>
            Feature Flags
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕ Fechar</Text>
        </TouchableOpacity>
      </View>

      {/* Aviso */}
      <View style={[styles.infoBox, { backgroundColor: theme.card }]}>
        <Text style={[styles.infoText, { color: theme.text }]}>
          🔒 Mudanças são aplicadas em tempo real para{" "}
          <Text style={{ fontWeight: "bold" }}>todos os usuários</Text>.
        </Text>
      </View>

      {/* Lista de flags */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" size="large" />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {Object.entries(FLAG_CONFIG).map(([key, config]) => {
            const isEnabled = !!flags[key];
            const isUpdating = updating === key;

            return (
              <View
                key={key}
                style={[
                  styles.flagCard,
                  { backgroundColor: theme.card },
                  isEnabled && styles.flagCardActive,
                ]}
              >
                <View style={styles.flagInfo}>
                  <Text style={styles.flagIcon}>{config.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.flagLabel, { color: theme.text }]}>
                      {config.label}
                    </Text>
                    <Text style={styles.flagDescription}>
                      {config.description}
                    </Text>
                    <Text style={styles.flagKey}>{key}</Text>
                  </View>
                </View>

                <View style={styles.flagControl}>
                  <View style={[styles.badge, isEnabled ? styles.badgeOn : styles.badgeOff]}>
                    <Text style={styles.badgeText}>{isEnabled ? "ON" : "OFF"}</Text>
                  </View>

                  {isUpdating ? (
                    <ActivityIndicator color="#6366f1" style={{ marginLeft: 8 }} />
                  ) : (
                    <Switch
                      value={isEnabled}
                      onValueChange={() => handleToggle(key, isEnabled)}
                      trackColor={{ false: "#d1d5db", true: "#6366f1" }}
                      thumbColor={isEnabled ? "#fff" : "#9ca3af"}
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </View>
              </View>
            );
          })}

          {/* Flags no banco que não têm descrição cadastrada */}
          {Object.keys(flags)
            .filter((k) => !FLAG_CONFIG[k])
            .map((key) => (
              <View
                key={key}
                style={[styles.flagCard, { backgroundColor: theme.card, opacity: 0.7 }]}
              >
                <View style={styles.flagInfo}>
                  <Text style={styles.flagIcon}>🏴</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.flagLabel, { color: theme.text }]}>{key}</Text>
                    <Text style={styles.flagDescription}>Flag sem descrição cadastrada</Text>
                    <Text style={styles.flagKey}>{key}</Text>
                  </View>
                </View>
                <View style={styles.flagControl}>
                  <View style={[styles.badge, flags[key] ? styles.badgeOn : styles.badgeOff]}>
                    <Text style={styles.badgeText}>{flags[key] ? "ON" : "OFF"}</Text>
                  </View>
                  <Switch
                    value={!!flags[key]}
                    onValueChange={() => handleToggle(key, !!flags[key])}
                    trackColor={{ false: "#d1d5db", true: "#6366f1" }}
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </View>
            ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: "bold" },
  subtitle: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  closeBtnText: { color: "#ef4444", fontWeight: "bold", fontSize: 13 },
  infoBox: {
    margin: 16,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#6366f1",
  },
  infoText: { fontSize: 13, lineHeight: 18, opacity: 0.8 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  flagCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  flagCardActive: { borderLeftWidth: 3, borderLeftColor: "#6366f1" },
  flagInfo: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  flagIcon: { fontSize: 26, marginRight: 12, marginTop: 2 },
  flagLabel: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  flagDescription: { fontSize: 13, color: "#6b7280", lineHeight: 18 },
  flagKey: {
    fontSize: 10,
    color: "#9ca3af",
    fontFamily: "monospace",
    marginTop: 4,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  flagControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeOn: { backgroundColor: "#dcfce7" },
  badgeOff: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 11, fontWeight: "bold", color: "#374151" },
});