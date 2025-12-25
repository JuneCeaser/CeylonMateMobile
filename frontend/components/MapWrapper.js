import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../constants/theme';

let MapView, Marker, Circle;

if (Platform.OS !== 'web') {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Circle = Maps.Circle;
}

export const ConditionalMapView = ({ children, ...props }) => {
    if (Platform.OS === 'web') {
        return (
            <View style={styles.webMapPlaceholder}>
                <Text style={styles.webMapText}>📍 Map view (mobile only)</Text>
                <Text style={styles.webMapSubtext}>
                    Maps are available on mobile devices
                </Text>
            </View>
        );
    }

    return <MapView {...props}>{children}</MapView>;
};

export const ConditionalMarker = (props) => {
    if (Platform.OS === 'web') return null;
    return <Marker {...props} />;
};

export const ConditionalCircle = (props) => {
    if (Platform.OS === 'web') return null;
    return <Circle {...props} />;
};

const styles = StyleSheet.create({
    webMapPlaceholder: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    webMapText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    webMapSubtext: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
});