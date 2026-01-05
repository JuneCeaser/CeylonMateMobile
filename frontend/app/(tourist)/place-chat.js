import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { Colors } from '../../constants/theme';

const API_URL = 'http://192.168.8.100:5000/api/places/chat';

export default function PlaceChatScreen() {
  const router = useRouter();
  const { placeId, placeName } = useLocalSearchParams();
  
  const [messages, setMessages] = useState([
    { id: 1, text: `Welcome to ${placeName}! I am your AI Guide. Ask me anything about the history or architecture.`, sender: 'ai' }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg = { id: Date.now(), text: inputText, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const response = await axios.post(API_URL, {
        placeId: placeId,
        question: userMsg.text
      });

      const aiMsg = { id: Date.now() + 1, text: response.data.answer, sender: 'ai' };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg = { id: Date.now() + 1, text: "Sorry, I lost connection to the history archives.", sender: 'ai' };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{placeName} Guide</Text>
        <View style={{width: 24}} />
      </View>

      {/* Chat List */}
      <FlatList
        data={messages}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
            <View style={[
                styles.bubble, 
                item.sender === 'user' ? styles.userBubble : styles.aiBubble
            ]}>
                <Text style={item.sender === 'user' ? styles.userText : styles.aiText}>
                    {item.text}
                </Text>
            </View>
        )}
      />

      {loading && (
          <View style={{padding: 10, alignItems: 'flex-start'}}>
              <Text style={{color: '#888', marginLeft: 20}}>AI Guide is typing...</Text>
          </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about this place..."
            placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: Colors.primary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  listContent: { padding: 20 },
  bubble: { padding: 15, borderRadius: 15, marginBottom: 10, maxWidth: '80%' },
  userBubble: { backgroundColor: Colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  aiBubble: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#e1e1e1' },
  userText: { color: '#fff', fontSize: 16 },
  aiText: { color: '#333', fontSize: 16 },
  inputContainer: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f8f9fa', padding: 12, borderRadius: 25, fontSize: 16, marginRight: 10 },
  sendBtn: { backgroundColor: Colors.primary, width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center' }
});