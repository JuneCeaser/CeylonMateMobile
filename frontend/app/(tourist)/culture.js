import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

export default function CultureScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Culture Component</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
    },
});