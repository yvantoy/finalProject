import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Modal,
  Image,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { setup_logger } from './src/logger';

// Trinity Municipal College Logo
const TMC_LOGO = require('./picture/tmclogo.png');

const Messenger = () => {
  const [screen, setScreen] = useState('login');
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatPartner, setChatPartner] = useState(null);
  const [conversations, setConversations] = useState({});
  const [inputText, setInputText] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [profilePictureBase64, setProfilePictureBase64] = useState(null);

  const logger = setup_logger();

  const generateAvatar = (username) => {
    const colors = ['#0078FF', '#4ECDC4', '#45B7D1', '#96CEB4', '#FF6B6B', '#6C63FF'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const initial = username.charAt(0).toUpperCase();
    return { color, initial };
  };

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasNoSpecialChars = !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (password.length < minLength) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    if (!hasUpperCase) {
      return { valid: false, message: 'Password must contain uppercase letters' };
    }
    if (!hasLowerCase) {
      return { valid: false, message: 'Password must contain lowercase letters' };
    }
    if (!hasNumbers) {
      return { valid: false, message: 'Password must contain numbers' };
    }
    if (!hasNoSpecialChars) {
      return { valid: false, message: 'Password cannot contain special symbols' };
    }
    return { valid: true, message: 'Password is strong' };
  };

  const getPairKey = (user1, user2) => [user1, user2].sort().join('-');

  const handleRegister = () => {
    logger.info(`Registration attempt for username: ${registerUsername}`);
    if (!registerUsername || !registerPassword || !registerConfirmPassword) {
      logger.warn('Registration failed: Missing fields');
      return Alert.alert('Error', 'Please fill all fields');
    }

    if (registerPassword !== registerConfirmPassword) {
      logger.warn('Registration failed: Passwords do not match');
      return Alert.alert('Error', 'Passwords do not match');
    }

    if (users.find((u) => u.username === registerUsername)) {
      logger.warn(`Registration failed: Username ${registerUsername} already exists`);
      return Alert.alert('Error', 'Username already exists');
    }

    const passwordValidation = validatePassword(registerPassword);
    if (!passwordValidation.valid) {
      logger.warn(`Registration failed: Weak password for ${registerUsername}`);
      return Alert.alert('Weak Password', passwordValidation.message);
    }

    const avatar = generateAvatar(registerUsername);
    setUsers([
      ...users,
      {
        username: registerUsername,
        password: registerPassword,
        avatar,
        fullName: '',
        bio: '',
        profilePicture: null,
      },
    ]);
    logger.info(`Account created successfully for username: ${registerUsername}`);
    Alert.alert('Success', 'Account created!');
    setRegisterUsername('');
    setRegisterPassword('');
    setRegisterConfirmPassword('');
    setScreen('login');
  };

  const handleLogin = () => {
    const user = users.find(
      (u) => u.username === loginUsername && u.password === loginPassword
    );
    if (!user) return Alert.alert('Error', 'Invalid credentials');
    setCurrentUser(user);
    setScreen('userList');
    setLoginUsername('');
    setLoginPassword('');
  };

  const selectUser = (user) => {
    if (!currentUser) {
      Alert.alert('Error', 'Please login first');
      setScreen('login');
      return;
    }
    setChatPartner(user.username);
    setScreen('chat');
    const pairKey = getPairKey(currentUser.username, user.username);
    if (!conversations[pairKey]) {
      setConversations({ ...conversations, [pairKey]: [] });
    }
  };

  const sendMessage = () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please login to send messages');
      setScreen('login');
      return;
    }
    if (!inputText.trim()) return;
    const pairKey = getPairKey(currentUser.username, chatPartner);

    // Get the latest user data from users array to ensure we have the most recent profile picture
    const latestUser = users.find(u => u.username === currentUser.username) || currentUser;

    const newMessage = {
      text: inputText,
      senderUsername: currentUser.username,
      profilePicture: latestUser.profilePicture || null,
      fullName: latestUser.fullName || currentUser.username,
    };
    setConversations({
      ...conversations,
      [pairKey]: [...(conversations[pairKey] || []), newMessage],
    });
    setInputText('');
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => selectUser(item)}>
      {item.profilePicture ? (
        <Image
          source={{ uri: item.profilePicture }}
          style={styles.userProfileImage}
        />
      ) : (
        <View style={[styles.avatar, { backgroundColor: item.avatar.color }]}>
          <Text style={styles.avatarText}>{item.avatar.initial}</Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userText}>{item.username}</Text>
        {item.fullName ? (
          <Text style={styles.userFullName}>{item.fullName}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }) => {
    const isMe = item.senderUsername === currentUser.username;
    const sender = users.find((u) => u.username === item.senderUsername);
    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRight : styles.messageLeft,
        ]}
      >
        {!isMe && sender && (
          <View style={styles.messageAvatarContainer}>
            {sender.profilePicture ? (
              <Image
                source={{ uri: sender.profilePicture }}
                style={styles.messageProfileImage}
              />
            ) : (
              <View style={[styles.messageAvatar, { backgroundColor: sender.avatar.color }]}>
                <Text style={styles.avatarText}>{sender.avatar.initial}</Text>
              </View>
            )}
          </View>
        )}
        <View
          style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}
        >
          <Text style={[styles.messageText, isMe ? { color: '#fff' } : { color: '#000' }]}>
            {item.text}
          </Text>
        </View>
        {isMe && (
          <View style={styles.messageAvatarContainer}>
            {item.profilePicture ? (
              <Image
                source={{ uri: item.profilePicture }}
                style={styles.messageProfileImage}
              />
            ) : (
              <View style={[styles.messageAvatar, { backgroundColor: currentUser.avatar.color }]}>
                <Text style={styles.avatarText}>{currentUser.avatar.initial}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const openProfileModal = () => {
    if (!currentUser) {
      Alert.alert('Error', 'No user is currently logged in');
      setScreen('login');
      return;
    }
    setEditFullName(currentUser.fullName || '');
    setEditBio(currentUser.bio || '');
    setProfilePictureBase64(currentUser.profilePicture || null);
    setShowProfileModal(true);
  };

  const openInfoModal = () => {
    setShowInfoModal(true);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled) {
        const base64 = result.assets[0].base64;
        const mimeType = result.assets[0].mimeType || 'image/jpeg';
        const imageUri = `data:${mimeType};base64,${base64}`;
        setProfilePictureBase64(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  const simulateImagePicker = () => {
    // Simulated base64 profile picture (you can replace with actual image picker)
    const sampleBase64 =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAA8ADwDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWm5yenqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW1+jpy8zN1tfa3OHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWm5yenqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW1+jpy8zN1tfa3OHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/9k';
    setProfilePictureBase64(sampleBase64);
  };

  const saveProfileChanges = () => {
    const profileData = {
      fullName: editFullName,
      bio: editBio,
      profilePicture: profilePictureBase64,
    };
    
    // Update users array with new profile data
    const updatedUsers = users.map((u) =>
      u.username === currentUser.username
        ? {
            ...u,
            ...profileData,
          }
        : u
    );
    setUsers(updatedUsers);
    
    // Update current user with new data
    const updatedCurrentUser = {
      ...currentUser,
      ...profileData,
    };
    setCurrentUser(updatedCurrentUser);
    setShowProfileModal(false);
    Alert.alert('Success', 'Profile updated! 🎉');
  };

  if (screen === 'register')
    return (
      <KeyboardAvoidingView
        style={styles.authContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.registerScrollContent}>
          <Text style={styles.title}>Create Account</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={registerUsername}
            onChangeText={setRegisterUsername}
          />
          <View>
            <TextInput
              style={styles.input}
              placeholder="Password (Min 8 chars, uppercase, lowercase, number)"
              secureTextEntry
              value={registerPassword}
              onChangeText={setRegisterPassword}
            />
            {registerPassword ? (
              <View style={styles.passwordValidation}>
                <Text
                  style={[
                    styles.validationText,
                    registerPassword.length >= 8
                      ? styles.valid
                      : styles.invalid,
                  ]}
                >
                  ✓ At least 8 characters
                </Text>
                <Text
                  style={[
                    styles.validationText,
                    /[A-Z]/.test(registerPassword)
                      ? styles.valid
                      : styles.invalid,
                  ]}
                >
                  ✓ Uppercase letter
                </Text>
                <Text
                  style={[
                    styles.validationText,
                    /[a-z]/.test(registerPassword)
                      ? styles.valid
                      : styles.invalid,
                  ]}
                >
                  ✓ Lowercase letter
                </Text>
                <Text
                  style={[
                    styles.validationText,
                    /[0-9]/.test(registerPassword)
                      ? styles.valid
                      : styles.invalid,
                  ]}
                >
                  ✓ Number
                </Text>
                <Text
                  style={[
                    styles.validationText,
                    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(registerPassword)
                      ? styles.valid
                      : styles.invalid,
                  ]}
                >
                  ✓ No special symbols
                </Text>
              </View>
            ) : null}
          </View>
          <View>
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              secureTextEntry
              value={registerConfirmPassword}
              onChangeText={setRegisterConfirmPassword}
            />
            {registerConfirmPassword ? (
              <View style={styles.passwordValidation}>
                <Text
                  style={[
                    styles.validationText,
                    registerPassword === registerConfirmPassword
                      ? styles.valid
                      : styles.invalid,
                  ]}
                >
                  {registerPassword === registerConfirmPassword
                    ? '✓ Passwords match'
                    : '✗ Passwords do not match'}
                </Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleRegister}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen('login')}>
            <Text style={styles.link}>Already have an account? Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );

  if (screen === 'login')
    return (
      <KeyboardAvoidingView
        style={styles.authContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.loginScrollContent}>
          {/* Trinity Municipal College Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={TMC_LOGO}
              style={styles.logo}
            />
            <Text style={styles.schoolName}>Trinidad Municipal College</Text>
          </View>

          <Text style={styles.title}>TMC_Messenger Login</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={loginUsername}
            onChangeText={setLoginUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={loginPassword}
            onChangeText={setLoginPassword}
          />
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen('register')}>
            <Text style={styles.link}>Don't have an account? Register</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );

  if (screen === 'userList') {
    if (!currentUser) {
      // Safety: if somehow we reached the user list without a current user, go back to login
      setScreen('login');
      return null;
    }
    const others = users.filter((u) => u.username !== currentUser.username);
    return (
      <View style={styles.listContainer}>
        {/* Header with Profile Icon */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={openInfoModal}
          >
            <Text style={styles.infoButtonText}>Info 🛠️</Text>
          </TouchableOpacity>

          <Text style={styles.headerText}>Chats</Text>

          <TouchableOpacity
            style={styles.profileIconButton}
            onPress={openProfileModal}
          >
            {currentUser.profilePicture ? (
              <Image
                source={{ uri: currentUser.profilePicture }}
                style={styles.headerProfileImage}
              />
            ) : (
              <View
                style={[
                  styles.profileIcon,
                  { backgroundColor: currentUser.avatar.color },
                ]}
              >
                <Text style={styles.profileIconText}>👤</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <FlatList data={others} renderItem={renderUser} keyExtractor={(u) => u.username} />

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            setScreen('login');
            setCurrentUser(null);
          }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Profile Modal */}
        <Modal
          visible={showProfileModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowProfileModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>My Profile</Text>
                <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Profile Picture Section */}
                <View style={styles.profilePictureSection}>
                  {profilePictureBase64 ? (
                    <Image
                      source={{ uri: profilePictureBase64 }}
                      style={styles.profilePicturePreview}
                    />
                  ) : (
                    <View
                      style={[
                        styles.profilePicturePlaceholder,
                        { backgroundColor: currentUser.avatar.color },
                      ]}
                    >
                      <Text style={styles.placeholderText}>
                        {currentUser.avatar.initial}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={pickImage}
                  >
                    <Text style={styles.uploadButtonText}>📸 Add Photo</Text>
                  </TouchableOpacity>
                </View>

                {/* Full Name Input */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.profileInput}
                    placeholder="Enter your full name"
                    value={editFullName}
                    onChangeText={setEditFullName}
                  />
                </View>

                {/* Bio Input */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Bio</Text>
                  <TextInput
                    style={[styles.profileInput, styles.bioInput]}
                    placeholder="Tell us about yourself..."
                    value={editBio}
                    onChangeText={setEditBio}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Username Display */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Username</Text>
                  <View style={[styles.profileInput, styles.disabledInput]}>
                    <Text style={styles.disabledText}>
                      {currentUser.username}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveProfileButton}
                onPress={saveProfileChanges}
              >
                <Text style={styles.saveProfileText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Info Modal */}
        <Modal
          visible={showInfoModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowInfoModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { paddingBottom: 30 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Info</Text>
                <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.infoCenter}>
                  <Image
                    source={
                      require('./picture/me.jpg')
                    }
                    style={styles.infoImage}
                  />
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Author/Submitted by:</Text>
                  <Text style={styles.infoValue}>Bryle Yvan Añora</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Submitted To:</Text>
                  <Text style={styles.infoValue}>Jay Ian Camelotes</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Short Bio:</Text>
                  <Text style={styles.infoValue}>
                    {currentUser && currentUser.bio
                      ? currentUser.bio
                      : "I'm a student at Trinidad Municipal College taking up Bachelor of Science in Information Technology."}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>Purok 1 Acacia, Cambangay Norte, San Miguel, Bohol</Text>
                </View>

                {currentUser && currentUser.address ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Address:</Text>
                    <Text style={styles.infoValue}>{currentUser.address}</Text>
                  </View>
                ) : null}

              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (screen === 'chat') {
    if (!currentUser) {
      setScreen('login');
      return null;
    }
    const pairKey = getPairKey(currentUser.username, chatPartner);
    const messages = conversations[pairKey] || [];
    const partnerUser = users.find(u => u.username === chatPartner);

    return (
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity
            onPress={() => setScreen('userList')}
            style={styles.backButton}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          {partnerUser && (
            <View style={styles.partnerInfo}
            >
              {partnerUser.profilePicture ? (
                <Image
                  source={{ uri: partnerUser.profilePicture }}
                  style={styles.headerChatAvatar}
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: partnerUser.avatar.color }]}>
                  <Text style={styles.avatarText}>{partnerUser.avatar.initial}</Text>
                </View>
              )}
              <Text style={styles.chatTitle}>{partnerUser.username}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.chatInfoButton} onPress={openInfoModal}>
            <Text style={styles.chatInfoText}>Info</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, i) => `${i}`}
          style={styles.chatList}
        />

        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  authContainer: { flex: 1, justifyContent: 'center', backgroundColor: '#E8EBF0', padding: 20 },
  loginScrollContent: { paddingVertical: 20, justifyContent: 'center', flexGrow: 1 },
  registerScrollContent: { paddingVertical: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 120, height: 120, borderRadius: 60, marginBottom: 10 },
  schoolName: { fontSize: 14, color: '#0078FF', fontWeight: '600', textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 25, marginBottom: 10, elevation: 1 },
  passwordValidation: { backgroundColor: '#f0f0f0', borderRadius: 10, padding: 10, marginBottom: 10 },
  validationText: { fontSize: 12, marginVertical: 3, fontWeight: '500' },
  valid: { color: '#4CAF50' },
  invalid: { color: '#F44336' },
  buttonPrimary: { backgroundColor: '#0078FF', paddingVertical: 12, borderRadius: 25, alignItems: 'center', marginBottom: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#0078FF', textAlign: 'center', marginTop: 5 },
  header: { backgroundColor: '#0078FF', padding: 15, alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' },
  headerText: { color: '#fff', fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  profileIconButton: { padding: 8 },
  profileIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  profileIconText: { fontSize: 20 },
  headerProfileImage: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#fff' },
  infoButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'transparent' },
  infoButtonText: { color: '#fff', fontWeight: '700' },
  listContainer: { flex: 1, backgroundColor: '#F6F7FB' },
  userItem: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderRadius: 10, marginHorizontal: 10, marginTop: 10, elevation: 2 },
  userProfileImage: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  userInfo: { flex: 1 },
  avatar: { width: 45, height: 45, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  userText: { fontSize: 17, color: '#333', fontWeight: '600' },
  userFullName: { fontSize: 13, color: '#888', marginTop: 2 },
  logoutButton: { alignItems: 'center', marginTop: 15, marginBottom: 20 },
  logoutText: { color: '#FF3B30', fontSize: 16 },

  // Profile Modal Styles
  modalContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#333' },
  closeButton: { fontSize: 24, fontWeight: '300', color: '#999' },
  modalBody: { padding: 20, paddingBottom: 100 },
  profilePictureSection: { alignItems: 'center', marginBottom: 30 },
  profilePicturePreview: { width: 120, height: 120, borderRadius: 60, marginBottom: 15, borderWidth: 3, borderColor: '#0078FF' },
  profilePicturePlaceholder: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 3, borderColor: '#0078FF' },
  placeholderText: { fontSize: 50, color: '#fff' },
  uploadButton: { backgroundColor: '#0078FF', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  profileInput: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16 },
  bioInput: { textAlignVertical: 'top', minHeight: 80 },
  disabledInput: { backgroundColor: '#f0f0f0' },
  disabledText: { color: '#999', fontSize: 16 },
  saveProfileButton: { backgroundColor: '#0078FF', paddingVertical: 14, marginHorizontal: 20, marginBottom: 20, borderRadius: 25, alignItems: 'center', elevation: 3 },
  saveProfileText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  messageAvatarContainer: { marginHorizontal: 4 },
  messageProfileImage: { width: 35, height: 35, borderRadius: 17 },

  // Chat Styles
  chatContainer: { flex: 1, backgroundColor: '#E5E7EB' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0078FF', paddingVertical: 12, paddingHorizontal: 10 },
  backButton: { paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#fff', fontSize: 22 },
  partnerInfo: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  headerChatAvatar: { width: 45, height: 45, borderRadius: 22, marginRight: 10 },
  chatTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
  chatInfoButton: { marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 6 },
  chatInfoText: { color: '#fff', fontWeight: '600' },
  chatList: { flex: 1, padding: 10 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 4 },
  messageLeft: { justifyContent: 'flex-start' },
  messageRight: { justifyContent: 'flex-end' },
  messageBubble: { padding: 10, borderRadius: 18, maxWidth: '70%', marginHorizontal: 6 },
  myBubble: { backgroundColor: '#0078FF', borderTopRightRadius: 4 },
  otherBubble: { backgroundColor: '#fff', borderTopLeftRadius: 4 },
  messageText: { fontSize: 16 },
  messageAvatar: { width: 35, height: 35, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  chatInputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff' },
  chatInput: { flex: 1, backgroundColor: '#F2F2F2', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 8, marginRight: 8 },
  sendButton: { backgroundColor: '#0078FF', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 8 },
  sendText: { color: '#fff', fontWeight: '600' },
  infoImage: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: '#0078FF', marginBottom: 12 },
  infoCenter: { alignItems: 'center', marginBottom: 10 },
  infoRow: { marginBottom: 14 },
  infoLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4 },
  infoValue: { fontSize: 16, color: '#555' },
});

export default Messenger;
