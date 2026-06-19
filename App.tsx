import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Easing, Dimensions,
  PanResponder, LayoutChangeEvent, Platform, ActivityIndicator,
  TextInput, Keyboard, Alert, Modal, KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, RadialGradient, Rect as SvgRect, Stop, Text as SvgText } from 'react-native-svg';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Image as ExpoImage } from 'expo-image';
import { useAuthStore, initAuthListener } from './src/stores/authStore';
import './global.css';

// ─────────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS
// ─────────────────────────────────────────────────────────────────
const { width: SCREEN_W, height: SH } = Dimensions.get('window');

const SHELF_FRACS = [0.47, 0.70] as const;
const SHELF_OVERLAP = 62;  // plank rises this many px behind bottle base
const BOTTLE_W     = 76;
const BOTTLE_H     = Math.round(SH * 0.24);
const PLANK_H      = 12;
const PANEL_H      = Math.min(Math.round(SH * 0.65), 490);
const SLOT_COUNT   = 6;
const SLOT_W       = Math.floor(SCREEN_W / SLOT_COUNT);
const PAGE_W       = SLOT_COUNT * SLOT_W;
const SHELF_MX     = 18;   // horizontal margin for shelf planks

const TAB_PILL_H   = 64;
const TAB_PILL_MX  = 16;   // horizontal margin of the pill
const TAB_PILL_BOT = -13;  // gap below the pill

const TAB_NAMES = ['Home', 'Mix', 'Explore', 'Search', 'Profile'] as const;

// ─────────────────────────────────────────────────────────────────
// THEME COLOR PALETTES
// ─────────────────────────────────────────────────────────────────
const NEON_PINK_PURPLE = '#e040fb';   // neon pink-purple for dark-mode sign

// ─────────────────────────────────────────────────────────────────
// BAR CUSTOMIZATION PRESETS
// ─────────────────────────────────────────────────────────────────
const BAR_NEON_COLORS = [
  { id: 'pink',     color: '#e040fb', label: '핑크',   labelEn: 'Pink',    cost: 0  },
  { id: 'cyan',     color: '#00e0ff', label: '사이언', labelEn: 'Cyan',    cost: 0  },
  { id: 'amber',    color: '#ffb830', label: '앰버',   labelEn: 'Amber',   cost: 0  },
  { id: 'green',    color: '#00e880', label: '그린',   labelEn: 'Green',   cost: 0  },
  { id: 'red',      color: '#ff4060', label: '레드',   labelEn: 'Red',     cost: 0  },
  { id: 'lavender', color: '#9060ff', label: '라벤더', labelEn: 'Violet',  cost: 0  },
  { id: 'gold',     color: '#ffd700', label: '골드',   labelEn: 'Gold',    cost: 30 },
  { id: 'ice',      color: '#a8e8ff', label: '아이스', labelEn: 'Ice',     cost: 30 },
  { id: 'rose',     color: '#ff6090', label: '로즈',   labelEn: 'Rose',    cost: 40 },
] as const;

const BAR_LIGHT_COLORS = [
  { id: 'warm',   color: '#ffd060', label: '웜 화이트', labelEn: 'Warm'   },
  { id: 'cool',   color: '#60d0ff', label: '쿨 블루',  labelEn: 'Cool'   },
  { id: 'pink',   color: '#ff80c0', label: '핑크',     labelEn: 'Pink'   },
  { id: 'mint',   color: '#60ff90', label: '민트',     labelEn: 'Mint'   },
  { id: 'amber',  color: '#ff9820', label: '딥 앰버',  labelEn: 'Amber'  },
  { id: 'purple', color: '#c060ff', label: '퍼플',     labelEn: 'Purple' },
] as const;

const BAR_WALL_THEMES = [
  { id: 'wood',       label: '우드',        labelEn: 'Wood',        darkBg: '#1c1a14', lightBg: '#e4dfd6', cost: 0  },
  { id: 'brick',      label: '브릭',        labelEn: 'Brick',       darkBg: '#1e1210', lightBg: '#ede0d8', cost: 0  },
  { id: 'slate',      label: '슬레이트',    labelEn: 'Slate',       darkBg: '#141820', lightBg: '#dde0e8', cost: 0  },
  { id: 'forest',     label: '포레스트',    labelEn: 'Forest',      darkBg: '#111814', lightBg: '#d8e4d8', cost: 0  },
  { id: 'marble',     label: '마블',        labelEn: 'Marble',      darkBg: '#19191e', lightBg: '#f2f0f6', cost: 50 },
  { id: 'midnight',   label: '미드나잇',    labelEn: 'Midnight',    darkBg: '#0c0c1e', lightBg: '#d5d5ed', cost: 60 },
  { id: 'crimson',    label: '크림슨',      labelEn: 'Crimson',     darkBg: '#1c0808', lightBg: '#f0dede', cost: 50 },
  { id: 'ocean',      label: '오션',        labelEn: 'Ocean',       darkBg: '#080e18', lightBg: '#d0dde8', cost: 60 },
  { id: 'sand',       label: '샌드',        labelEn: 'Sand',        darkBg: '#1a160a', lightBg: '#f2ead8', cost: 40 },
  { id: 'industrial', label: '인더스트리얼', labelEn: 'Industrial',  darkBg: '#111118', lightBg: '#d8d8e0', cost: 70 },
] as const;
type WallThemeId = typeof BAR_WALL_THEMES[number]['id'];

const BAR_SHELF_THEMES = [
  { id: 'oak',    label: '오크',   labelEn: 'Oak',    dark: '#22201a', darkEdge: '#342c1c', light: '#b8ab96', lightEdge: '#a89880' },
  { id: 'walnut', label: '월넛',   labelEn: 'Walnut', dark: '#180e06', darkEdge: '#281808', light: '#7a5438', lightEdge: '#6a4428' },
  { id: 'ebony',  label: '에보니', labelEn: 'Ebony',  dark: '#0e0e0e', darkEdge: '#1a1616', light: '#2e2824', lightEdge: '#221e1a' },
  { id: 'maple',  label: '메이플', labelEn: 'Maple',  dark: '#2a2016', darkEdge: '#3c3020', light: '#dec9a0', lightEdge: '#ccb88e' },
  { id: 'cherry', label: '체리',   labelEn: 'Cherry', dark: '#280e0e', darkEdge: '#3c1818', light: '#b86858', lightEdge: '#a85848' },
] as const;
type ShelfThemeId = typeof BAR_SHELF_THEMES[number]['id'];

const BAR_COUNTER_THEMES = [
  { id: 'marble', label: '마블',    labelEn: 'Marble',   dark: '#161210', darkTop: '#1c1916', light: '#eae5db', lightTop: '#f0ebe0' },
  { id: 'slate',  label: '슬레이트',labelEn: 'Slate',    dark: '#131418', darkTop: '#191d22', light: '#d4d8e2', lightTop: '#dde1eb' },
  { id: 'wood',   label: '우드',    labelEn: 'Wood',     dark: '#1a1208', darkTop: '#22180e', light: '#b08860', lightTop: '#c09870' },
  { id: 'steel',  label: '스틸',    labelEn: 'Steel',    dark: '#141418', darkTop: '#1c1c22', light: '#c4c6d0', lightTop: '#d0d2dc' },
] as const;
type CounterThemeId = typeof BAR_COUNTER_THEMES[number]['id'];

const BAR_PLAYER_STYLES = [
  { id: 'cd',       label: 'CD',     labelEn: 'CD Player' },
  { id: 'cassette', label: '카세트', labelEn: 'Cassette'  },
  { id: 'radio',    label: '라디오', labelEn: 'Radio'     },
] as const;
type PlayerStyleId = typeof BAR_PLAYER_STYLES[number]['id'];

const BAR_PLAYER_COLORS = [
  { id: 'classic', label: '클래식', labelEn: 'Classic', dark: '#2c2c3a', light: '#f5f3ef' },
  { id: 'black',   label: '블랙',   labelEn: 'Black',   dark: '#101014', light: '#1c1c1c' },
  { id: 'silver',  label: '실버',   labelEn: 'Silver',  dark: '#3c3c4a', light: '#c8cad2' },
  { id: 'wood',    label: '우드',   labelEn: 'Wood',    dark: '#2a1808', light: '#b88858' },
  { id: 'cream',   label: '크림',   labelEn: 'Cream',   dark: '#2e2820', light: '#f0ece0' },
] as const;
type PlayerColorId = typeof BAR_PLAYER_COLORS[number]['id'];

// ─────────────────────────────────────────────────────────────────
// BGM TRACKS  (internet radio streams; user can swap URLs)
// ─────────────────────────────────────────────────────────────────
const BGM_TRACKS = [
  { label: 'JAZZ',   url: 'https://knkx-live-a.edge.audiocdn.com/6285_128k',   color: '#ffb830' },
  { label: 'LOUNGE', url: 'https://streaming.live365.com/b05055_128mp3',       color: '#00e0ff' },
  { label: 'BLUES',  url: 'http://ais-sa2.wdc01.cdnstream.com:80/1992_128.mp3', color: '#b000ff' },
] as const;
type BgmMoodIdx = 0 | 1 | 2;

// Module-level singleton — persists across screen changes and re-renders
let _bgmSound: Audio.Sound | null = null;
let _bgmUrl:   string | null = null;

async function _bgmStart(url: string): Promise<boolean> {
  // Same URL already loaded → resume from pause (no new stream)
  if (_bgmSound && _bgmUrl === url) {
    try {
      await _bgmSound.playAsync();
      return true;
    } catch {
      try { await _bgmSound.unloadAsync(); } catch { /* ignore */ }
      _bgmSound = null;
      _bgmUrl   = null;
    }
  }
  // URL changed → unload existing before creating new
  if (_bgmSound) {
    try { await _bgmSound.stopAsync();   } catch { /* ignore */ }
    try { await _bgmSound.unloadAsync(); } catch { /* ignore */ }
    _bgmSound = null;
    _bgmUrl   = null;
  }
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true, volume: 0.55 },
    );
    _bgmSound = sound;
    _bgmUrl   = url;
    return true;
  } catch (error) {
    console.warn('BGM failed to load:', url, error);
    _bgmSound = null;
    _bgmUrl   = null;
    return false;
  }
}

// pause only — keeps sound loaded for fast resume
async function _bgmStop(): Promise<void> {
  if (_bgmSound) {
    try { await _bgmSound.pauseAsync(); } catch { /* ignore */ }
  }
}

// full unload — used when switching mood/URL
async function _bgmUnload(): Promise<void> {
  if (_bgmSound) {
    try { await _bgmSound.stopAsync();   } catch { /* ignore */ }
    try { await _bgmSound.unloadAsync(); } catch { /* ignore */ }
    _bgmSound = null;
    _bgmUrl   = null;
  }
}

// Visitor bar audio — separate singleton so it doesn't conflict with user's own BGM
let _visitorSound: Audio.Sound | null = null;
let _visitorUrl:   string | null = null;

async function _visitorAudioStart(url: string): Promise<boolean> {
  if (_visitorSound && _visitorUrl === url) {
    try { await _visitorSound.playAsync(); return true; }
    catch { try { await _visitorSound.unloadAsync(); } catch {} _visitorSound = null; _visitorUrl = null; }
  }
  if (_visitorSound) {
    try { await _visitorSound.stopAsync();   } catch {}
    try { await _visitorSound.unloadAsync(); } catch {}
    _visitorSound = null; _visitorUrl = null;
  }
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: url }, { shouldPlay: true, volume: 0.45 },
    );
    _visitorSound = sound; _visitorUrl = url; return true;
  } catch { _visitorSound = null; _visitorUrl = null; return false; }
}

async function _visitorAudioPause(): Promise<void> {
  if (_visitorSound) { try { await _visitorSound.pauseAsync(); } catch {} }
}

async function _visitorAudioUnload(): Promise<void> {
  if (_visitorSound) {
    try { await _visitorSound.stopAsync();   } catch {}
    try { await _visitorSound.unloadAsync(); } catch {}
    _visitorSound = null; _visitorUrl = null;
  }
}

const DARK_C = {
  bg:        '#0e0e18',
  surface:   '#161622',
  surfaceHi: '#1e1e2e',
  border:    '#28284a',
  text:      '#f0f0f8',
  textDim:   '#78789a',
  primary:   '#00e0ff',
  secondary: '#b000ff',
  accent:    '#ffb830',
  wall:      '#1c1a14',
  wallMid:   '#222018',
  shelf:     '#22201a',
  shelfEdge: '#342c1c',
};
const LIGHT_C = {
  bg:        '#f4f1ea',
  surface:   '#eae7e0',
  surfaceHi: '#dedad2',
  border:    '#cac6bc',
  text:      '#1e1c18',
  textDim:   '#7a7870',
  primary:   '#0077aa',
  secondary: '#7700cc',
  accent:    '#b87800',
  wall:      '#e4dfd6',
  wallMid:   '#d8d3c8',
  shelf:     '#b8ab96',
  shelfEdge: '#a89880',
};
type Colors = typeof DARK_C;

// ─────────────────────────────────────────────────────────────────
// STYLE FACTORY
// ─────────────────────────────────────────────────────────────────
function makeStyles(C: Colors, isDark: boolean) {
  return StyleSheet.create({
    safeArea:       { flex: 1, backgroundColor: C.bg },

    // ── Home ──────────────────────────────────────────────────────
    home:           { flex: 1, backgroundColor: C.wall },
    homeHeaderSafe: { backgroundColor: C.bg },
    homeHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 4 },
    homeGreeting:   { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
    homeAtmo:       { fontSize: 13, color: C.textDim, marginTop: 3 },
    homeCount:      { fontSize: 12, color: C.textDim, opacity: 0.55, paddingHorizontal: 22, marginTop: 1 },
    homeTap:        { fontSize: 11, color: C.textDim, opacity: 0.38, paddingHorizontal: 22, marginTop: 2, paddingBottom: 6 },

    headerBtns:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    themeBtn:    { width: 40, height: 34, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    themeBtnTxt: { fontSize: 17, color: C.textDim },
    bgmBtn:      { minWidth: 40, height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1 },
    bgmBtnIcon:  { fontSize: 26, textAlign: 'center' },
    bgmBtnLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
    // language controls (Profile only)
    langBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    langTxt:     { fontSize: 11, fontWeight: '700', color: C.textDim, letterSpacing: 0.5 },
    langActive:  { color: C.primary },
    langSep:     { fontSize: 11, color: C.border },

    // ── Cabinet ───────────────────────────────────────────────────
    cabinetArea: { flex: 1 },

    // ── Wall ──────────────────────────────────────────────────────
    grainLine: {
      position: 'absolute', left: 0, right: 0, height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.04)',
    },
    signArea:   { position: 'absolute', top: 0, left: 0, right: 0, height: '20%', alignItems: 'center', justifyContent: 'center' },
    signFrame:  { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
    signRule:   { width: 64, height: 0, borderTopWidth: 1 },
    signEst:    { fontSize: 9, letterSpacing: 3.5, fontWeight: '600', marginTop: 5 },

    // ── Neon text ─────────────────────────────────────────────────
    neonWrap:   { alignItems: 'center' },
    neonBase:   { fontWeight: '900', fontStyle: 'italic', letterSpacing: 3.5, textAlign: 'center' },
    neonScript: {
      fontFamily:    Platform.OS === 'ios' ? 'Snell Roundhand' : 'cursive',
      fontWeight:    '400' as const,
      textAlign:     'center' as const,
      letterSpacing: 2,
    },

    // ── Overlay ───────────────────────────────────────────────────
    overlay: { backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 10 },

    // ── Bottom panel ──────────────────────────────────────────────
    panel: {
      position: 'absolute', bottom: 0, left: 0, right: 0, height: PANEL_H,
      backgroundColor:      C.surface,
      borderTopLeftRadius:  22, borderTopRightRadius: 22,
      borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
      borderColor:          C.border, zIndex: 20, overflow: 'hidden',
    },
    panelScroll:        { flex: 1 },
    panelScrollContent: { paddingHorizontal: 22, paddingBottom: 32 },
    panelHandle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    panelHeaderRow:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
    panelName:          { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    panelBrand:         { fontSize: 13, color: C.textDim, marginTop: 2 },
    closeBtn:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.border },
    closeBtnTxt:        { fontSize: 12, fontWeight: '700', color: C.textDim },
    panelDesc:          { fontSize: 13, color: C.textDim, lineHeight: 19, marginBottom: 4 },

    radarWrap:   { alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
    aiCard:      { marginTop: 8, backgroundColor: C.bg, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.border },
    aiCardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    aiCardLabel: { color: C.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
    aiCardSub:   { color: C.textDim, fontSize: 11 },
    aiCardName:  { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3, marginBottom: 4 },
    aiCardIngr:  { fontSize: 13, color: C.textDim, lineHeight: 19, marginBottom: 10 },
    vibeRow:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    vibeTag:     { color: C.accent, fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },

    // ── Mix screen ────────────────────────────────────────────────
    mixScroll:    { padding: 20, paddingBottom: 60 },
    mixHeader:    { marginBottom: 26, marginTop: 16 },
    mixTitle:     { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
    mixSub:       { fontSize: 14, color: C.textDim, marginTop: 6 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 26 },
    chip:         { backgroundColor: C.surface, paddingVertical: 11, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: C.surfaceHi },
    chipOn:       { backgroundColor: `${C.primary}18`, borderColor: C.primary, shadowColor: C.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 8 },
    chipTxt:      { color: C.textDim, fontSize: 14, fontWeight: '500' },
    chipTxtOn:    { color: C.primary, fontSize: 14, fontWeight: '700' },
    analyzeBtn:   { backgroundColor: C.surface, borderRadius: 16, paddingVertical: 17, alignItems: 'center', borderWidth: 1, borderColor: C.secondary, shadowColor: C.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12 },
    analyzeTxt:   { color: C.text, fontSize: 15, fontWeight: 'bold', letterSpacing: 0.8 },
    resultBox:    { marginTop: 34, backgroundColor: C.surface, borderRadius: 22, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: C.surfaceHi },
    aiBadge:      { backgroundColor: `${C.primary}14`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: `${C.primary}48` },
    aiBadgeTxt:   { color: C.primary, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    tagsRow:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
    flavorTag:    { color: C.accent, fontSize: 13, fontWeight: '600', backgroundColor: `${C.accent}14`, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
    simCard:      { marginTop: 26, width: '100%', backgroundColor: C.bg, padding: 16, borderRadius: 14, borderLeftWidth: 3, borderLeftColor: C.secondary },
    simTitle:     { color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
    simRow:       { flexDirection: 'row', alignItems: 'center', gap: 14 },
    simPct:       { color: C.text, fontSize: 28, fontWeight: '900' },
    simDesc:      { color: C.textDim, fontSize: 13, flex: 1, lineHeight: 19 },
    simHL:        { color: C.text, fontWeight: 'bold' },
    saveBtn:      { marginTop: 24, width: '100%', backgroundColor: C.text, paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
    saveBtnTxt:   { color: C.bg, fontSize: 15, fontWeight: 'bold' },

    // ── Mix screen — bar section ──────────────────────────────────
    mixBarHeader:    { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 },
    mixBarTitle:     { fontSize: 34, fontWeight: '900', color: C.text, letterSpacing: -1 },
    mixBarSub:       { fontSize: 13, color: C.textDim, marginTop: 4 },
    catChip:         { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.surfaceHi },
    catChipOn:       { backgroundColor: `${C.primary}18`, borderColor: C.primary },
    catChipTxt:      { fontSize: 13, fontWeight: '500', color: C.textDim },
    catChipTxtOn:    { color: C.primary, fontWeight: '700' },
    mixDivider:      { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 34, marginBottom: 24 },
    mixDividerLine:  { flex: 1, height: 1, backgroundColor: C.border },
    mixDividerLabel: { fontSize: 11, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1.5, paddingHorizontal: 14 },

    // ── Stub screens ──────────────────────────────────────────────
    stubCenter:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
    stubIcon:       { marginBottom: 18, opacity: 0.22 },
    stubTitle:      { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3, marginBottom: 6 },
    stubSub:        { fontSize: 14, color: C.textDim },

    profileHeader:  { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 16 },
    profileTitle:   { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
    profileSection: { paddingHorizontal: 22, marginTop: 10 },
    profileLabel:   { fontSize: 11, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    profileRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    profileRowTxt:  { fontSize: 15, color: C.text, fontWeight: '500' },
    profileToggle:  { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    profileTogTxt:  { fontSize: 13, fontWeight: '700', color: C.primary },

    // ── Genome / Archive toggle ───────────────────────────────────
    genomeToggle:   { flexDirection: 'row', marginHorizontal: 20, marginBottom: 14, backgroundColor: C.surfaceHi, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 3 },
    genomeToggleTab:{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
    genomeTabActive:{ backgroundColor: C.primary },
    genomeTabTxt:   { fontSize: 13, fontWeight: '700', color: C.textDim },
    genomeTabTxtAct:{ color: C.bg },

    // ── Taste Genome view ──────────────────────────────────────────
    genomeCard:     { marginHorizontal: 20, marginTop: 8, marginBottom: 16, backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, alignItems: 'center' },
    genomeSeclbl:   { fontSize: 11, fontWeight: '800', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 12 },
    genomeInsight:  { fontSize: 14, color: C.text, fontStyle: 'italic', marginTop: 10, textAlign: 'center', lineHeight: 20 },
    journalCard:    { marginHorizontal: 20, marginBottom: 8, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14 },
    journalTag:     { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

    // ── Mix — ratio adjustment ─────────────────────────────────────
    adjustDimRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
    adjustLabel:    { width: 46, fontSize: 11, fontWeight: '600', color: C.textDim },
    adjustBtn:      { width: 22, height: 22, borderRadius: 11, backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    adjustBtnTxt:   { fontSize: 14, lineHeight: 18 },
    adjustDot:      { flex: 1, height: 6, borderRadius: 3 },

    // ── Mix — multi-similarity ─────────────────────────────────────
    simMultiCard:   { marginTop: 6, width: '100%', backgroundColor: C.bg, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
    simMultiBar:    { height: 3, backgroundColor: C.border, borderRadius: 2, marginTop: 7, overflow: 'hidden' },
    simMultiFill:   { height: 3, backgroundColor: C.secondary, borderRadius: 2 },
  });
}

const darkStyles  = makeStyles(DARK_C, true);
const lightStyles = makeStyles(LIGHT_C, false);

// ─────────────────────────────────────────────────────────────────
// i18n
// ─────────────────────────────────────────────────────────────────
const T_EN = {
  greeting:    (h: number): string =>
    h < 6 ? 'Good Night' : h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : h < 21 ? 'Good Evening' : 'Good Night',
  atmosphere:  (h: number): string =>
    h < 6 ? 'The night pours slowly...' : h < 12 ? 'A quiet morning.' : h < 17 ? 'Afternoon clarity.' : h < 20 ? 'Golden hour.' : 'Tonight, take your time.',
  barCount:    (n: number): string => `${n} bottles`,
  tapHint:     'Tap · Long press to rearrange',
  close:       'Close',
  aiLabel:     '✦ AI MAGIC RECIPE',
  basedOn:     (s: string): string => `based on ${s}`,
  radarLabels: ['Sweet', 'Sour', 'Bitter', 'Body', 'Aroma'],
  mixTitle:    'Custom Mix',
  mixSub:      'Select ingredients — AI predicts the flavor.',
  selectIngr:  'SELECT INGREDIENTS',
  analyzeBtn:  'AI Taste Prediction',
  analyzing:   'AI Analyzing...',
  aiPred:      '✨ AI PREDICTION',
  tasteSim:    'TASTE SIMILARITY',
  saveRecipe:  'Save Recipe to Archive',
  exploreSub:  'Discover cocktails from around the world.',
  searchSub:   'Find spirits, recipes, and flavor profiles.',
  profileTitle:'Profile',
  settingsLbl: 'SETTINGS',
  themeLbl:    'Theme',
  langLbl:     'Language',
  myNotes:     'MY NOTES',
  purchased:   'Purchased',
  purchasedAt: 'Store',
  opened:      'Opened',
  flavorProfile:'FLAVOR PROFILE',
  saveToJournal: 'Save to Taste Journal',
  viewGenome:    'Taste DNA',
  viewArchive:   'Archive',
  genomeLabel:   'MY SIGNATURE',
  genomeEmpty:   'Mix & save recipes to build your Taste DNA',
  genomeJournal: 'TASTE JOURNAL',
};
const T_KO = {
  greeting:    (h: number): string =>
    h < 6 ? '좋은 밤이에요' : h < 12 ? '좋은 아침이에요' : h < 17 ? '좋은 오후에요' : h < 21 ? '좋은 저녁이에요' : '좋은 밤이에요',
  atmosphere:  (h: number): string =>
    h < 6 ? '밤이 고요히 흐릅니다...' : h < 12 ? '조용한 아침이네요.' : h < 17 ? '차분한 오후입니다.' : h < 20 ? '황금빛 저녁이에요.' : '오늘 밤, 천천히 즐겨보세요.',
  barCount:    (n: number): string => `${n}병`,
  tapHint:     '탭 · 길게 눌러 위치 변경',
  close:       '닫기',
  aiLabel:     '✦ AI 매직 레시피',
  basedOn:     (s: string): string => `${s} 기반`,
  radarLabels: ['단맛', '신맛', '쓴맛', '바디', '향'],
  mixTitle:    '커스텀 믹스',
  mixSub:      '재료를 고르면 AI가 맛을 예측합니다.',
  selectIngr:  '재료 선택',
  analyzeBtn:  'AI 맛 예측하기',
  analyzing:   'AI 분석 중...',
  aiPred:      '✨ AI 예측',
  tasteSim:    '취향 유사도',
  saveRecipe:  '이 레시피 Archive에 저장',
  exploreSub:  '전 세계의 칵테일을 탐색해보세요.',
  searchSub:   '주류, 레시피, 풍미 프로필을 검색하세요.',
  profileTitle:'프로필',
  settingsLbl: '설정',
  themeLbl:    '테마',
  langLbl:     '언어',
  myNotes:     '나의 기록',
  purchased:   '구매일',
  purchasedAt: '구매처',
  opened:      '개봉일',
  flavorProfile:'풍미 프로필',
  saveToJournal: '테이스트 저널에 저장',
  viewGenome:    '취향 DNA',
  viewArchive:   '아카이브',
  genomeLabel:   '나의 시그니처',
  genomeEmpty:   '믹스를 저장하면 취향 DNA가 만들어집니다',
  genomeJournal: '테이스트 저널',
};
type Texts = typeof T_EN;
const TEXTS: Record<'en' | 'ko', Texts> = { en: T_EN, ko: T_KO };

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
type Lang    = 'en' | 'ko';
type Theme   = 'dark' | 'light';
type SpiritT = 'whiskey' | 'gin' | 'vodka' | 'rum' | 'tequila' | 'brandy' | 'campari' | 'amaretto' | 'other';
type Qty     = 'full' | 'high' | 'medium' | 'low';
type FlavorP = { sweet: number; sour: number; bitter: number; body: number; aroma: number };
type RecipeCategory = 'cocktail' | 'nonalcoholic' | 'lowabv';

interface JournalEntry {
  id: string;
  mixName: string;
  ingredients: string[];
  profile: FlavorP;
  tags: string[];
  rating: number;
  savedAt: string;
}
type ProfileView = 'archive' | 'genome';

interface PastDrink { name: string; nameKo: string; profile: FlavorP; emoji: string }
const PAST_DRINKS_DB: PastDrink[] = [
  { name:'Smoky Margarita',  nameKo:'스모키 마가리타',  emoji:'🍹', profile:{sweet:2,sour:4,bitter:2,body:3,aroma:3} },
  { name:'Espresso Martini', nameKo:'에스프레소 마티니',emoji:'☕', profile:{sweet:3,sour:1,bitter:4,body:3,aroma:5} },
  { name:'Whiskey Sour',     nameKo:'위스키 사워',      emoji:'🥃', profile:{sweet:3,sour:4,bitter:2,body:4,aroma:4} },
  { name:'Negroni',          nameKo:'네그로니',          emoji:'🍊', profile:{sweet:2,sour:1,bitter:5,body:3,aroma:4} },
  { name:'Piña Colada',      nameKo:'피냐 콜라다',       emoji:'🥥', profile:{sweet:5,sour:2,bitter:1,body:5,aroma:5} },
  { name:'Gin & Tonic',      nameKo:'진 토닉',           emoji:'🫧', profile:{sweet:1,sour:2,bitter:3,body:2,aroma:4} },
];

interface AtmosphereMood {
  timeLabel: string; timeLabelKo: string; emoji: string;
  cocktailEn: string; cocktailKo: string; cocktailImg: string;
  musicGenre: string; musicGenreKo: string;
  lightColor: string; lightLabel: string; lightLabelKo: string;
  movieEn: string; movieKo: string;
  bgmMoodIdx: BgmMoodIdx;
}
function getMoodByHour(h: number): AtmosphereMood {
  if (h >= 5 && h < 11) return {
    timeLabel:'Morning Calm',      timeLabelKo:'고요한 아침',   emoji:'🌅',
    cocktailEn:'Aperol Spritz',    cocktailKo:'아페롤 스프리츠',
    cocktailImg:'https://www.thecocktaildb.com/images/ingredients/Aperol-Medium.png',
    musicGenre:'Acoustic Jazz',    musicGenreKo:'어쿠스틱 재즈',
    lightColor:'#ffb830', lightLabel:'Warm Amber', lightLabelKo:'따뜻한 앰버',
    movieEn:'Lost in Translation', movieKo:'사랑도 통역이 되나요', bgmMoodIdx:0,
  };
  if (h >= 11 && h < 17) return {
    timeLabel:'Afternoon Breeze',       timeLabelKo:'오후의 바람', emoji:'☀️',
    cocktailEn:'Gin & Tonic',           cocktailKo:'진 토닉',
    cocktailImg:'https://www.thecocktaildb.com/images/ingredients/Gin-Medium.png',
    musicGenre:'Bossa Nova',            musicGenreKo:'보사 노바',
    lightColor:'#00d4ff', lightLabel:'Clear Blue', lightLabelKo:'맑은 블루',
    movieEn:'The Grand Budapest Hotel', movieKo:'그랜드 부다페스트 호텔', bgmMoodIdx:1,
  };
  if (h >= 17 && h < 21) return {
    timeLabel:'Golden Hour',    timeLabelKo:'황금빛 저녁', emoji:'🌇',
    cocktailEn:'Whiskey Sour',  cocktailKo:'위스키 사워',
    cocktailImg:'https://www.thecocktaildb.com/images/ingredients/Bourbon-Medium.png',
    musicGenre:'Neo Soul',      musicGenreKo:'네오 소울',
    lightColor:'#ff8c00', lightLabel:'Golden', lightLabelKo:'골든',
    movieEn:'Midnight in Paris', movieKo:'미드나잇 인 파리', bgmMoodIdx:1,
  };
  return {
    timeLabel:'Late Night',      timeLabelKo:'늦은 밤', emoji:'🌙',
    cocktailEn:'Negroni',        cocktailKo:'네그로니',
    cocktailImg:'https://www.thecocktaildb.com/images/ingredients/Campari-Medium.png',
    musicGenre:'Late-Night Blues',musicGenreKo:'레이트 나이트 블루스',
    lightColor:'#b000ff', lightLabel:'Deep Purple', lightLabelKo:'딥 퍼플',
    movieEn:'Mulholland Drive',  movieKo:'멀홀랜드 드라이브', bgmMoodIdx:2,
  };
}
interface Recipe {
  id: string; name: string; nameKo: string;
  category: RecipeCategory; difficulty: 'Easy' | 'Medium' | 'Hard';
  prepMins: number; abv: number | null;
  descEn: string; descKo: string;
  ingredients: string[]; ingredientsKo: string[];
  stepsEn: string[]; stepsKo: string[];
  color: string;
  heroApiName?: string;
}

interface InventoryItem {
  id: string; name: string; apiName: string; spiritType: SpiritT;
  brand?: string; abv?: number; quantity: Qty; profile: FlavorP;
  desc: { en: string; ko: string };
  myRating?: number;
  purchaseDate?: string;
  purchasePlace?: string;
  openedDate?: string;
  myNote?: { en: string; ko: string };
  cocktailAttempts?: number;
}
interface MixIngredient {
  id: string;
  name: string;
  nameKo: string;
  type: 'Spirit' | 'Mixer' | 'Syrup' | 'Juice' | 'Bitters' | 'Base' | string;
  color: string;
  baseProfile: FlavorP;
  role: 'base' | 'modifier' | 'sour' | 'sweet' | 'bitter' | 'aromatic' | 'lengthener';
  abv: number;
  sugar: number;
  acid: number;
}

// ─────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────
const BOTTLE_VSCALE: number[] = [1.00, 0.93, 0.87, 0.97, 0.95, 0.90, 0.88, 0.96];





const PANTRY_INGREDIENTS: MixIngredient[] = [
  // 1. Sour (산미료)
  {
    id: 'p_lime', name: 'Lime Juice', nameKo: '라임 주스', type: 'Juice', color: '#5cb85c',
    baseProfile: { sweet: 1, sour: 5, bitter: 1, body: 1, aroma: 3 },
    role: 'sour', abv: 0, sugar: 1, acid: 5
  },
  {
    id: 'p_lemon', name: 'Lemon Juice', nameKo: '레몬 주스', type: 'Juice', color: '#f0ad4e',
    baseProfile: { sweet: 1, sour: 5, bitter: 1, body: 1, aroma: 3 },
    role: 'sour', abv: 0, sugar: 1, acid: 5
  },
  // 2. Sweet (감미료)
  {
    id: 'p_syrup', name: 'Simple Syrup', nameKo: '심플 시럽', type: 'Syrup', color: '#fcfcfc',
    baseProfile: { sweet: 5, sour: 0, bitter: 0, body: 2, aroma: 1 },
    role: 'sweet', abv: 0, sugar: 5, acid: 0
  },
  {
    id: 'p_honey', name: 'Honey Syrup', nameKo: '꿀 시럽', type: 'Syrup', color: '#ffc107',
    baseProfile: { sweet: 5, sour: 0, bitter: 1, body: 3, aroma: 4 },
    role: 'sweet', abv: 0, sugar: 5, acid: 0
  },
  {
    id: 'p_grenadine', name: 'Grenadine Syrup', nameKo: '그레나딘 시럽', type: 'Syrup', color: '#d9534f',
    baseProfile: { sweet: 5, sour: 1, bitter: 0, body: 2, aroma: 3 },
    role: 'sweet', abv: 0, sugar: 5, acid: 1
  },
  // 3. Modifier (리큐어 / 보조주)
  {
    id: 'p_sverm', name: 'Sweet Vermouth', nameKo: '스위트 베르무트', type: 'Spirit', color: '#8b0000',
    baseProfile: { sweet: 4, sour: 1, bitter: 3, body: 3, aroma: 4 },
    role: 'modifier', abv: 16, sugar: 4, acid: 1
  },
  {
    id: 'p_dverm', name: 'Dry Vermouth', nameKo: '드라이 베르무트', type: 'Spirit', color: '#ffffe0',
    baseProfile: { sweet: 1, sour: 2, bitter: 2, body: 2, aroma: 3 },
    role: 'modifier', abv: 18, sugar: 1, acid: 2
  },
  {
    id: 'p_triple', name: 'Triple Sec', nameKo: '트리플 섹', type: 'Spirit', color: '#ffffe0',
    baseProfile: { sweet: 4, sour: 1, bitter: 1, body: 2, aroma: 4 },
    role: 'modifier', abv: 30, sugar: 4, acid: 1
  },
  // 4. Bitter (비터스)
  {
    id: 'p_bitters', name: 'Angostura Bitters', nameKo: '앙고스투라 비터스', type: 'Bitters', color: '#5b3a29',
    baseProfile: { sweet: 1, sour: 0, bitter: 5, body: 2, aroma: 5 },
    role: 'bitter', abv: 44, sugar: 1, acid: 0
  },
  // 5. Lengthener (탄산수 / 희석제)
  {
    id: 'p_soda', name: 'Soda Water', nameKo: '탄산수', type: 'Mixer', color: '#e6f2ff',
    baseProfile: { sweet: 0, sour: 0, bitter: 0, body: 1, aroma: 0 },
    role: 'lengthener', abv: 0, sugar: 0, acid: 0
  },
  {
    id: 'p_tonic', name: 'Tonic Water', nameKo: '토닉 워터', type: 'Mixer', color: '#f0f8ff',
    baseProfile: { sweet: 3, sour: 1, bitter: 2, body: 1, aroma: 2 },
    role: 'lengthener', abv: 0, sugar: 3, acid: 1
  },
  {
    id: 'p_ginger', name: 'Ginger Ale', nameKo: '진저에일', type: 'Mixer', color: '#fcf8e3',
    baseProfile: { sweet: 4, sour: 1, bitter: 1, body: 2, aroma: 2 },
    role: 'lengthener', abv: 0, sugar: 4, acid: 1
  },
  {
    id: 'p_cola', name: 'Cola', nameKo: '콜라', type: 'Mixer', color: '#2b1a0a',
    baseProfile: { sweet: 4, sour: 1, bitter: 1, body: 2, aroma: 3 },
    role: 'lengthener', abv: 0, sugar: 4, acid: 1
  }
];

// PAST_DRINKS_DB defined above with RecipeCategory types

const RECIPES: Recipe[] = [
  {
    id: 'r1', name: 'Negroni', nameKo: '네그로니',
    category: 'cocktail', difficulty: 'Easy', prepMins: 3, abv: 24,
    descEn: 'A bittersweet Italian classic with gin, Campari, and sweet vermouth.',
    descKo: '진, 캄파리, 스위트 베르무트의 달콤 쌉싸름한 이탈리안 클래식.',
    ingredients: ['Gin 30ml', 'Campari 30ml', 'Sweet Vermouth 30ml', 'Orange peel'],
    ingredientsKo: ['진 30ml', '캄파리 30ml', '스위트 베르무트 30ml', '오렌지 껍질'],
    stepsEn: ['Fill a mixing glass with ice.', 'Add gin, Campari, and sweet vermouth.', 'Stir for 30 seconds until chilled.', 'Strain into an Old Fashioned glass over a large ice cube.', 'Garnish with an orange peel twist.'],
    stepsKo: ['믹싱 글라스에 얼음을 채웁니다.', '진, 캄파리, 스위트 베르무트를 넣습니다.', '30초간 스터하여 차갑게 만듭니다.', '올드패션드 글라스에 큰 얼음 위로 스트레인합니다.', '오렌지 껍질로 가니시합니다.'],
    color: '#c84820', heroApiName: 'Campari',
  },
  {
    id: 'r2', name: 'Espresso Martini', nameKo: '에스프레소 마티니',
    category: 'cocktail', difficulty: 'Medium', prepMins: 5, abv: 22,
    descEn: 'A rich coffee cocktail that wakes you up and calms you down at the same time.',
    descKo: '동시에 각성시키고 진정시키는 진한 커피 칵테일.',
    ingredients: ['Vodka 50ml', 'Espresso 30ml (cooled)', 'Coffee Liqueur 20ml', 'Simple Syrup 5ml'],
    ingredientsKo: ['보드카 50ml', '에스프레소 30ml (식힌 것)', '커피 리큐어 20ml', '심플 시럽 5ml'],
    stepsEn: ['Chill a martini glass in the freezer.', 'Add all ingredients to a shaker with ice.', 'Shake vigorously for 15 seconds.', 'Double-strain into the chilled glass.', 'Garnish with 3 coffee beans.'],
    stepsKo: ['마티니 글라스를 냉동실에서 차갑게 합니다.', '모든 재료를 얼음과 함께 쉐이커에 넣습니다.', '15초간 힘차게 쉐이킹합니다.', '차가운 글라스에 더블 스트레인합니다.', '커피 빈 3개로 가니시합니다.'],
    color: '#3a1808', heroApiName: 'Vodka',
  },
  {
    id: 'r3', name: 'Whiskey Sour', nameKo: '위스키 사워',
    category: 'cocktail', difficulty: 'Easy', prepMins: 4, abv: 20,
    descEn: 'A perfectly balanced classic with bourbon, lemon, and a silky egg white foam.',
    descKo: '버번, 레몬, 달걀 흰자 폼이 완벽하게 균형 잡힌 클래식.',
    ingredients: ['Bourbon 60ml', 'Lemon Juice 30ml', 'Simple Syrup 20ml', 'Egg White 1 (optional)'],
    ingredientsKo: ['버번 60ml', '레몬 주스 30ml', '심플 시럽 20ml', '달걀 흰자 1개 (선택)'],
    stepsEn: ['Dry shake all ingredients without ice for 10 seconds.', 'Add ice and shake again for 15 seconds.', 'Strain into a rocks glass over ice.', 'Garnish with a lemon wheel and cherry.'],
    stepsKo: ['얼음 없이 모든 재료를 10초간 드라이 쉐이크합니다.', '얼음을 넣고 15초간 다시 쉐이킹합니다.', '락스 글라스에 얼음 위로 스트레인합니다.', '레몬 휠과 체리로 가니시합니다.'],
    color: '#d87820', heroApiName: 'Bourbon',
  },
  {
    id: 'r4', name: 'Virgin Mojito', nameKo: '버진 모히토',
    category: 'nonalcoholic', difficulty: 'Easy', prepMins: 3, abv: null,
    descEn: 'A refreshing alcohol-free mojito bursting with fresh mint and lime.',
    descKo: '신선한 민트와 라임이 가득한 상쾌한 무알콜 모히토.',
    ingredients: ['Lime Juice 30ml', 'Fresh Mint 8 leaves', 'Simple Syrup 20ml', 'Soda Water 120ml', 'Crushed Ice'],
    ingredientsKo: ['라임 주스 30ml', '신선한 민트 8장', '심플 시럽 20ml', '탄산수 120ml', '크러시드 아이스'],
    stepsEn: ['Muddle mint leaves with simple syrup in a glass.', 'Add lime juice and fill with crushed ice.', 'Top with soda water and stir gently.', 'Garnish with mint sprigs and a lime wheel.'],
    stepsKo: ['글라스에서 민트 잎과 심플 시럽을 머들합니다.', '라임 주스를 넣고 크러시드 아이스로 채웁니다.', '탄산수로 마무리하고 부드럽게 저어줍니다.', '민트와 라임 휠로 가니시합니다.'],
    color: '#1a7040',
  },
  {
    id: 'r5', name: 'Cucumber Spritz', nameKo: '큐컴버 스프리츠',
    category: 'nonalcoholic', difficulty: 'Easy', prepMins: 2, abv: null,
    descEn: 'A crisp, elegant sparkling drink with cucumber and elderflower.',
    descKo: '오이와 엘더플라워로 만든 상쾌하고 우아한 스파클링 드링크.',
    ingredients: ['Cucumber Slices 5', 'Elderflower Cordial 30ml', 'Lemon Juice 15ml', 'Sparkling Water 150ml'],
    ingredientsKo: ['오이 슬라이스 5조각', '엘더플라워 코디얼 30ml', '레몬 주스 15ml', '탄산수 150ml'],
    stepsEn: ['Muddle cucumber slices gently in a glass.', 'Add elderflower cordial and lemon juice.', 'Fill with ice and top with sparkling water.', 'Garnish with a thin cucumber ribbon.'],
    stepsKo: ['글라스에서 오이 슬라이스를 부드럽게 머들합니다.', '엘더플라워 코디얼과 레몬 주스를 넣습니다.', '얼음을 채우고 탄산수로 마무리합니다.', '얇은 오이 리본으로 가니시합니다.'],
    color: '#307860',
  },
  {
    id: 'r6', name: 'Aperol Spritz', nameKo: '아페롤 스프리츠',
    category: 'lowabv', difficulty: 'Easy', prepMins: 2, abv: 8,
    descEn: 'A light and bubbly Italian aperitivo, perfect for any hour.',
    descKo: '언제 마셔도 좋은 가볍고 버블한 이탈리안 아페리티보.',
    ingredients: ['Aperol 60ml', 'Prosecco 90ml', 'Soda Water (splash)', 'Orange Slice'],
    ingredientsKo: ['아페롤 60ml', '프로세코 90ml', '탄산수 약간', '오렌지 슬라이스'],
    stepsEn: ['Fill a wine glass with ice.', 'Pour Prosecco first, then Aperol.', 'Add a splash of soda water.', 'Garnish with an orange slice.'],
    stepsKo: ['와인 글라스에 얼음을 채웁니다.', '프로세코를 먼저, 그 다음 아페롤을 붓습니다.', '탄산수를 조금 더합니다.', '오렌지 슬라이스로 가니시합니다.'],
    color: '#e05010', heroApiName: 'Aperol',
  },
];

const EXTRA_RECIPES: Recipe[] = [
  { id:'r7',  name:'Old Fashioned',   nameKo:'올드 패션드',
    category:'cocktail', difficulty:'Easy',   prepMins:3,  abv:32,
    descEn:'The original cocktail — whiskey, sugar, bitters, and citrus peel.',
    descKo:'오리지널 칵테일. 위스키, 설탕, 비터스, 시트러스 필.',
    ingredients:['Bourbon 60ml','Sugar Cube 1','Angostura Bitters 2 dashes','Orange Peel'],
    ingredientsKo:['버번 60ml','각설탕 1개','앙고스투라 비터스 2 대시','오렌지 필'],
    stepsEn:['Place sugar cube in glass, saturate with bitters.','Muddle the sugar.','Add bourbon and a large ice cube.','Stir 20 seconds. Express orange peel.'],
    stepsKo:['글라스에 각설탕을 넣고 비터스로 적십니다.','설탕을 머들합니다.','버번과 큰 얼음을 넣습니다.','20초 스터. 오렌지 필을 표현합니다.'],
    color:'#b85820', heroApiName:'Bourbon' },
  { id:'r8',  name:'Margarita',       nameKo:'마가리타',
    category:'cocktail', difficulty:'Easy',   prepMins:4,  abv:18,
    descEn:'Tequila, lime, and triple sec shaken with salt on the rim.',
    descKo:'테킬라, 라임, 트리플섹을 쉐이크. 소금 림.',
    ingredients:['Tequila 50ml','Triple Sec 25ml','Fresh Lime Juice 25ml','Salt (rim)'],
    ingredientsKo:['테킬라 50ml','트리플섹 25ml','생 라임주스 25ml','소금(림)'],
    stepsEn:['Rim glass with salt.','Shake all ingredients with ice.','Strain into chilled glass.','Garnish with lime wheel.'],
    stepsKo:['글라스 림에 소금을 묻힙니다.','모든 재료를 얼음과 쉐이크합니다.','차가운 글라스에 스트레인합니다.','라임 휠로 가니시합니다.'],
    color:'#c8a018', heroApiName:'Tequila' },
  { id:'r9',  name:'Manhattan',       nameKo:'맨해튼',
    category:'cocktail', difficulty:'Medium', prepMins:4,  abv:28,
    descEn:'Rye whiskey, sweet vermouth, and bitters — stirred, never shaken.',
    descKo:'라이 위스키, 스위트 베르무트, 비터스. 반드시 스터.',
    ingredients:['Rye Whiskey 60ml','Sweet Vermouth 30ml','Angostura Bitters 2 dashes','Maraschino Cherry'],
    ingredientsKo:['라이 위스키 60ml','스위트 베르무트 30ml','앙고스투라 비터스 2 대시','마라스키노 체리'],
    stepsEn:['Combine all in mixing glass with ice.','Stir 30 seconds.','Strain into chilled coupe.','Garnish with cherry.'],
    stepsKo:['믹싱 글라스에 얼음과 함께 넣습니다.','30초 스터합니다.','차가운 쿠페에 스트레인합니다.','체리로 가니시합니다.'],
    color:'#901c08', heroApiName:'Rye Whiskey' },
  { id:'r10', name:'Daiquiri',        nameKo:'다이키리',
    category:'cocktail', difficulty:'Easy',   prepMins:3,  abv:20,
    descEn:'Rum, lime, and sugar. Elegant simplicity in three ingredients.',
    descKo:'럼, 라임, 설탕. 세 가지 재료의 우아한 단순함.',
    ingredients:['White Rum 60ml','Fresh Lime Juice 30ml','Simple Syrup 15ml'],
    ingredientsKo:['화이트 럼 60ml','생 라임주스 30ml','심플 시럽 15ml'],
    stepsEn:['Shake all ingredients vigorously with ice.','Double-strain into chilled coupe.','Garnish with lime twist.'],
    stepsKo:['모든 재료를 얼음과 힘차게 쉐이크합니다.','차가운 쿠페에 더블 스트레인합니다.','라임 트위스트로 가니시합니다.'],
    color:'#c8d818', heroApiName:'Light rum' },
  { id:'r11', name:'Moscow Mule',     nameKo:'모스크바 뮬',
    category:'cocktail', difficulty:'Easy',   prepMins:2,  abv:10,
    descEn:'Vodka and ginger beer over ice in a copper mug.',
    descKo:'구리 머그에 보드카와 진저비어를 넣은 청량한 칵테일.',
    ingredients:['Vodka 50ml','Ginger Beer 120ml','Fresh Lime Juice 15ml','Mint Sprig'],
    ingredientsKo:['보드카 50ml','진저비어 120ml','생 라임주스 15ml','민트 스프리그'],
    stepsEn:['Fill copper mug with ice.','Add vodka and lime juice.','Top with ginger beer.','Garnish with mint.'],
    stepsKo:['구리 머그에 얼음을 채웁니다.','보드카와 라임주스를 넣습니다.','진저비어를 부어 채웁니다.','민트로 가니시합니다.'],
    color:'#58a818', heroApiName:'Vodka' },
  { id:'r12', name:'Gin & Tonic',     nameKo:'진 토닉',
    category:'cocktail', difficulty:'Easy',   prepMins:2,  abv:12,
    descEn:'The quintessential British long drink. Gin, tonic, and botanicals.',
    descKo:'영국을 대표하는 롱 드링크. 진, 토닉, 보태니컬.',
    ingredients:['Gin 50ml','Premium Tonic Water 150ml','Cucumber Slice','Lime Wedge'],
    ingredientsKo:['진 50ml','프리미엄 토닉워터 150ml','오이 슬라이스','라임 웨지'],
    stepsEn:['Fill large glass with ice.','Add gin, then tonic slowly.','Garnish with cucumber and lime.'],
    stepsKo:['큰 글라스에 얼음을 채웁니다.','진을 넣고 토닉을 천천히 붓습니다.','오이와 라임으로 가니시합니다.'],
    color:'#28a858', heroApiName:'Gin' },
  { id:'r13', name:'Paloma',          nameKo:'팔로마',
    category:'cocktail', difficulty:'Easy',   prepMins:3,  abv:14,
    descEn:'Mexico\'s favourite tequila drink — grapefruit, lime, and salt.',
    descKo:'멕시코 국민 칵테일. 자몽, 라임, 소금.',
    ingredients:['Tequila 50ml','Grapefruit Juice 90ml','Lime Juice 15ml','Soda Water','Salt (rim)'],
    ingredientsKo:['테킬라 50ml','자몽주스 90ml','라임주스 15ml','탄산수','소금(림)'],
    stepsEn:['Salt rim of glass.','Add ice and tequila.','Add juices and top with soda.','Stir gently.'],
    stepsKo:['글라스 림에 소금을 묻힙니다.','얼음과 테킬라를 넣습니다.','주스를 넣고 탄산수로 채웁니다.','살짝 스터합니다.'],
    color:'#e07818', heroApiName:'Tequila' },
  { id:'r14', name:'Clover Club',     nameKo:'클로버 클럽',
    category:'cocktail', difficulty:'Medium', prepMins:5,  abv:16,
    descEn:'A pre-Prohibition gin classic with raspberry and silky egg white foam.',
    descKo:'금주법 이전의 진 클래식. 라즈베리와 달걀 흰자 폼.',
    ingredients:['Gin 45ml','Fresh Lemon Juice 20ml','Raspberry Syrup 15ml','Egg White 1'],
    ingredientsKo:['진 45ml','생 레몬주스 20ml','라즈베리 시럽 15ml','달걀 흰자 1개'],
    stepsEn:['Dry shake all ingredients.','Add ice and shake hard.','Double-strain into chilled coupe.','Garnish with 3 raspberries.'],
    stepsKo:['모든 재료를 드라이 쉐이크합니다.','얼음을 넣고 세게 쉐이크합니다.','차가운 쿠페에 더블 스트레인합니다.','라즈베리 3개로 가니시합니다.'],
    color:'#c82858', heroApiName:'Gin' },
];

interface SearchSpirit {
  id: string;
  name: string; nameKo: string;
  apiName: string;
  brand: string;
  spiritType: SpiritT;
  typeLabel: string; typeLabelKo: string;
  abv: number;
  origin: string; originKo: string;
  profile: FlavorP;
  tags: string[]; tagsKo: string[];
}

const SEARCH_SPIRITS: SearchSpirit[] = [
  { id:'ss1',  name:'Bourbon',        nameKo:'버번',       apiName:'Bourbon',        brand:"Maker's Mark",    spiritType:'whiskey', typeLabel:'Bourbon Whiskey',    typeLabelKo:'버번 위스키',
    abv:45, origin:'USA', originKo:'미국',
    profile:{sweet:4,sour:1,bitter:2,body:4,aroma:4}, tags:['Vanilla','Caramel','Oak'], tagsKo:['바닐라','캐러멜','오크'] },
  { id:'ss2',  name:'Scotch',         nameKo:'스카치',     apiName:'Scotch',         brand:'Glenfarclas 15',  spiritType:'whiskey', typeLabel:'Single Malt Scotch',  typeLabelKo:'싱글몰트 스카치',
    abv:46, origin:'Scotland', originKo:'스코틀랜드',
    profile:{sweet:3,sour:0,bitter:3,body:5,aroma:5}, tags:['Sherry','Dried Fruit','Smoke'], tagsKo:['쉐리','말린 과일','스모크'] },
  { id:'ss3',  name:'Irish Whiskey',  nameKo:'아이리시 위스키', apiName:'Irish whiskey', brand:'Jameson', spiritType:'whiskey', typeLabel:'Irish Whiskey',      typeLabelKo:'아이리시 위스키',
    abv:40, origin:'Ireland', originKo:'아일랜드',
    profile:{sweet:3,sour:1,bitter:1,body:3,aroma:3}, tags:['Smooth','Honey','Light'], tagsKo:['부드러움','꿀','가벼움'] },
  { id:'ss4',  name:'Japanese Whisky',nameKo:'재패니즈 위스키', apiName:'Japanese Whisky', brand:'Yamazaki 12', spiritType:'whiskey', typeLabel:'Japanese Whisky',     typeLabelKo:'재패니즈 위스키',
    abv:43, origin:'Japan', originKo:'일본',
    profile:{sweet:4,sour:0,bitter:2,body:4,aroma:5}, tags:['Floral','Peach','Mizunara Oak'], tagsKo:['플로럴','복숭아','미즈나라 오크'] },
  { id:'ss5',  name:'Tennessee Whiskey',nameKo:'테네시 위스키',apiName:'Tennessee Whiskey', brand:"Jack Daniel's",spiritType:'whiskey', typeLabel:'Tennessee Whiskey',   typeLabelKo:'테네시 위스키',
    abv:40, origin:'USA', originKo:'미국',
    profile:{sweet:3,sour:1,bitter:2,body:3,aroma:3}, tags:['Charcoal','Maple','Vanilla'], tagsKo:['숯','메이플','바닐라'] },
  { id:'ss6',  name:'Gin',            nameKo:'진',         apiName:'Gin',            brand:"Hendrick's",      spiritType:'gin',     typeLabel:'London Dry Gin',      typeLabelKo:'런던 드라이 진',
    abv:44, origin:'Scotland', originKo:'스코틀랜드',
    profile:{sweet:1,sour:1,bitter:2,body:2,aroma:5}, tags:['Rose','Cucumber','Floral'], tagsKo:['장미','오이','플로럴'] },
  { id:'ss7',  name:'Gin',            nameKo:'진',         apiName:'Gin',            brand:'Tanqueray',       spiritType:'gin',     typeLabel:'London Dry Gin',      typeLabelKo:'런던 드라이 진',
    abv:47, origin:'England', originKo:'영국',
    profile:{sweet:1,sour:1,bitter:3,body:2,aroma:4}, tags:['Juniper','Citrus','Crisp'], tagsKo:['주니퍼','시트러스','크리스프'] },
  { id:'ss8',  name:'Gin',            nameKo:'진',         apiName:'Gin',            brand:'Monkey 47',       spiritType:'gin',     typeLabel:'Schwarzwald Dry Gin', typeLabelKo:'슈바르츠발트 드라이 진',
    abv:47, origin:'Germany', originKo:'독일',
    profile:{sweet:2,sour:1,bitter:2,body:2,aroma:5}, tags:['47 Botanicals','Pepper','Pine'], tagsKo:['47가지 보태니컬','페퍼','파인'] },
  { id:'ss9',  name:'Vodka',          nameKo:'보드카',     apiName:'Vodka',          brand:'Grey Goose',      spiritType:'vodka',   typeLabel:'French Vodka',        typeLabelKo:'프렌치 보드카',
    abv:40, origin:'France', originKo:'프랑스',
    profile:{sweet:1,sour:0,bitter:1,body:2,aroma:1}, tags:['Clean','Neutral','Smooth'], tagsKo:['클린','뉴트럴','부드러움'] },
  { id:'ss10', name:'Vodka',          nameKo:'보드카',     apiName:'Vodka',          brand:'Belvedere',       spiritType:'vodka',   typeLabel:'Polish Rye Vodka',     typeLabelKo:'폴란드 라이 보드카',
    abv:40, origin:'Poland', originKo:'폴란드',
    profile:{sweet:1,sour:0,bitter:1,body:3,aroma:2}, tags:['Creamy','Grain','Silky'], tagsKo:['크리미','곡물','실키'] },
  { id:'ss11', name:'Tequila',        nameKo:'테킬라',     apiName:'Tequila',        brand:"Patrón Silver",   spiritType:'tequila', typeLabel:'Blanco Tequila',      typeLabelKo:'블랑코 테킬라',
    abv:40, origin:'Mexico', originKo:'멕시코',
    profile:{sweet:2,sour:2,bitter:1,body:3,aroma:4}, tags:['Agave','Citrus','Herbal'], tagsKo:['아가베','시트러스','허벌'] },
  { id:'ss12', name:'Tequila',        nameKo:'테킬라',     apiName:'Tequila',        brand:'Don Julio Blanco',spiritType:'tequila', typeLabel:'Blanco Tequila',      typeLabelKo:'블랑코 테킬라',
    abv:40, origin:'Mexico', originKo:'멕시코',
    profile:{sweet:3,sour:1,bitter:1,body:3,aroma:4}, tags:['Agave','Floral','Pepper'], tagsKo:['아가베','플로럴','페퍼'] },
  { id:'ss13', name:'Cognac',         nameKo:'코냑',       apiName:'Cognac',         brand:'Hennessy VS',     spiritType:'brandy',  typeLabel:'Cognac',              typeLabelKo:'코냑',
    abv:40, origin:'France', originKo:'프랑스',
    profile:{sweet:3,sour:1,bitter:2,body:4,aroma:5}, tags:['Dried Fruit','Oak','Spice'], tagsKo:['말린 과일','오크','스파이스'] },
  { id:'ss14', name:'Cognac',         nameKo:'코냑',       apiName:'Cognac',         brand:'Rémy Martin VSOP',spiritType:'brandy',  typeLabel:'Cognac VSOP',         typeLabelKo:'코냑 VSOP',
    abv:40, origin:'France', originKo:'프랑스',
    profile:{sweet:4,sour:1,bitter:2,body:4,aroma:5}, tags:['Vanilla','Floral','Long Finish'], tagsKo:['바닐라','플로럴','긴 피니시'] },
  { id:'ss15', name:'Campari',        nameKo:'캄파리',     apiName:'Campari',        brand:'Campari',         spiritType:'campari', typeLabel:'Bitter Aperitivo',    typeLabelKo:'비터 아페리티보',
    abv:25, origin:'Italy', originKo:'이탈리아',
    profile:{sweet:2,sour:1,bitter:5,body:3,aroma:3}, tags:['Bitter Orange','Herbal','Aperitivo'], tagsKo:['비터 오렌지','허벌','아페리티보'] },
  { id:'ss16', name:'Amaretto',       nameKo:'아마레토',   apiName:'Amaretto',       brand:'Disaronno',       spiritType:'amaretto',typeLabel:'Almond Liqueur',      typeLabelKo:'아몬드 리큐어',
    abv:28, origin:'Italy', originKo:'이탈리아',
    profile:{sweet:5,sour:0,bitter:2,body:3,aroma:5}, tags:['Almond','Apricot','Sweet'], tagsKo:['아몬드','살구','달콤함'] },
  { id:'ss17', name:'Rum',            nameKo:'럼',         apiName:'Light rum',      brand:'Bacardi Superior',spiritType:'rum',     typeLabel:'White Rum',           typeLabelKo:'화이트 럼',
    abv:40, origin:'Puerto Rico', originKo:'푸에르토리코',
    profile:{sweet:2,sour:1,bitter:1,body:2,aroma:2}, tags:['Clean','Light','Cane'], tagsKo:['클린','라이트','사탕수수'] },
  { id:'ss18', name:'Dark Rum',       nameKo:'다크 럼',    apiName:'Dark rum',       brand:'Ron Zacapa 23',   spiritType:'rum',     typeLabel:'Aged Rum',            typeLabelKo:'에이지드 럼',
    abv:40, origin:'Guatemala', originKo:'과테말라',
    profile:{sweet:4,sour:1,bitter:2,body:5,aroma:5}, tags:['Molasses','Chocolate','Toffee'], tagsKo:['당밀','초콜릿','토피'] },
  { id:'ss19', name:'Absinthe',       nameKo:'압생트',     apiName:'Absinthe',       brand:'Pernod',          spiritType:'other',   typeLabel:'Anise Spirit',        typeLabelKo:'아니스 스피릿',
    abv:68, origin:'France', originKo:'프랑스',
    profile:{sweet:1,sour:0,bitter:3,body:2,aroma:5}, tags:['Anise','Herbal','Wormwood'], tagsKo:['아니스','허벌','쑥'] },
  { id:'ss20', name:'Mezcal',         nameKo:'메즈칼',     apiName:'Mezcal',         brand:'Del Maguey',      spiritType:'tequila', typeLabel:'Artisanal Mezcal',    typeLabelKo:'아르티사날 메즈칼',
    abv:46, origin:'Mexico', originKo:'멕시코',
    profile:{sweet:2,sour:1,bitter:2,body:4,aroma:5}, tags:['Smoky','Roasted Agave','Earthy'], tagsKo:['스모키','구운 아가베','어시'] },
];

const FLAVOR_TAGS: Array<{ id: string; label: string; labelKo: string; icon: string; spiritTypes: SpiritT[] }> = [
  { id:'sweet',   label:'Sweet',   labelKo:'달콤한',   icon:'🍯', spiritTypes:['amaretto','rum'] },
  { id:'sour',    label:'Sour',    labelKo:'신',       icon:'🍋', spiritTypes:['gin','tequila'] },
  { id:'bitter',  label:'Bitter',  labelKo:'쓴',       icon:'🌿', spiritTypes:['campari','whiskey'] },
  { id:'smoky',   label:'Smoky',   labelKo:'스모키',   icon:'🔥', spiritTypes:['whiskey','tequila'] },
  { id:'floral',  label:'Floral',  labelKo:'플로럴',   icon:'🌸', spiritTypes:['gin','brandy'] },
  { id:'herbal',  label:'Herbal',  labelKo:'허벌',     icon:'🌱', spiritTypes:['gin','campari'] },
  { id:'fruity',  label:'Fruity',  labelKo:'과일향',   icon:'🍑', spiritTypes:['brandy','rum'] },
  { id:'nutty',   label:'Nutty',   labelKo:'고소한',   icon:'🥜', spiritTypes:['amaretto','whiskey'] },
  { id:'clean',   label:'Clean',   labelKo:'깔끔한',   icon:'💧', spiritTypes:['vodka','gin'] },
  { id:'bold',    label:'Bold',    labelKo:'강렬한',   icon:'⚡', spiritTypes:['whiskey','campari'] },
];

const ALL_RECIPES = [...RECIPES, ...EXTRA_RECIPES];

const RECIPE_CATS: Array<{ id: 'all' | RecipeCategory; label: string; labelKo: string }> = [
  { id: 'all',          label: 'All',       labelKo: '전체'   },
  { id: 'cocktail',     label: 'Cocktails', labelKo: '칵테일' },
  { id: 'nonalcoholic', label: 'Non-Alc',   labelKo: '논알콜' },
  { id: 'lowabv',       label: 'Low ABV',   labelKo: '저도수' },
];

// ─────────────────────────────────────────────────────────────────
// STORES
// ─────────────────────────────────────────────────────────────────
interface AppStore {
  lang:          Lang;        toggleLang:    () => void;
  theme:         Theme;       toggleTheme:   () => void;
  bgmPlaying:    boolean;     setBgmPlaying: (v: boolean) => void;
  bgmLoading:    boolean;     setBgmLoading: (v: boolean) => void;
  bgmMoodIdx:    BgmMoodIdx;  setBgmMoodIdx: (n: BgmMoodIdx) => void;
  homeCabH:      number;      setHomeCabH:   (h: number) => void;
  homeCabTop:    number;      setHomeCabTop: (y: number) => void;
  savedBarIds:    string[];   toggleSavedBar:    (id: string) => void;
  savedSpiritIds: string[];   toggleSavedSpirit: (id: string) => void;
  savedRecipeIds: string[];   toggleSavedRecipe: (id: string) => void;
  journalEntries:   JournalEntry[]; addJournalEntry: (e: JournalEntry) => void;
  barModeVisible:   boolean;        setBarModeVisible: (v: boolean) => void;
  authModalVisible: boolean;        setAuthModalVisible: (v: boolean) => void;
  inventoryItems: InventoryItem[];
  shelf0Ids: string[];
  shelf1Ids: string[];
  setShelf0Ids: (ids: string[]) => void;
  setShelf1Ids: (ids: string[]) => void;
  addInventoryItem: (item: InventoryItem) => void;
  removeInventoryItem: (id: string) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  customRecipes: Recipe[];
  addCustomRecipe: (r: Recipe) => void;
  seedInjected: boolean;
  setSeedInjected: (v: boolean) => void;
  barName:           string;           setBarName:           (v: string) => void;
  myBarBio:          string;           setMyBarBio:          (v: string) => void;
  barNeonColor:      string;           setBarNeonColor:      (v: string) => void;
  barWallThemeId:    WallThemeId;      setBarWallThemeId:    (v: WallThemeId) => void;
  barLightColor:     string;           setBarLightColor:     (v: string) => void;
  barShelfThemeId:   ShelfThemeId;     setBarShelfThemeId:   (v: ShelfThemeId) => void;
  barCounterThemeId: CounterThemeId;   setBarCounterThemeId: (v: CounterThemeId) => void;
  barPlayerStyleId:  PlayerStyleId;    setBarPlayerStyleId:  (v: PlayerStyleId) => void;
  barPlayerColorId:  PlayerColorId;    setBarPlayerColorId:  (v: PlayerColorId) => void;
  userPoints:           number;
  unlockedPremiumIds:   string[];
  cocktailAttemptDates: Record<string, string>;
  notePointsEarned:     Record<string, boolean>;
  earnPoints:           (n: number) => void;
  unlockPremium:        (itemId: string, cost: number) => boolean;
  logCocktailAttempt:   (itemId: string) => void;
  awardNotePoints:      (itemId: string) => void;
}
const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      lang:          'ko',
      toggleLang:    () => set((s) => ({ lang:  s.lang  === 'en'   ? 'ko'   : 'en'   })),
      theme:         'light',
      toggleTheme:   () => set((s) => ({ theme: s.theme === 'dark' ? 'light': 'dark'  })),
      bgmPlaying:    false,
      setBgmPlaying: (v) => set({ bgmPlaying: v }),
      bgmLoading:    false,
      setBgmLoading: (v) => set({ bgmLoading: v }),
      bgmMoodIdx:    0, // Initial mood index will be synced on mount
      setBgmMoodIdx: (n) => set({ bgmMoodIdx: n }),
      homeCabH:      0,
      setHomeCabH:   (h) => set({ homeCabH: h }),
      homeCabTop:    0,
      setHomeCabTop: (y) => set({ homeCabTop: y }),
      savedBarIds:    ['bp5','bp9','bp13'],
      toggleSavedBar:    (id) => set((s) => ({ savedBarIds:    s.savedBarIds.includes(id)    ? s.savedBarIds.filter(x => x !== id)    : [...s.savedBarIds, id]    })),
      savedSpiritIds: ['ss1','ss4','ss6','ss13','ss20'],
      toggleSavedSpirit: (id) => set((s) => ({ savedSpiritIds: s.savedSpiritIds.includes(id) ? s.savedSpiritIds.filter(x => x !== id) : [...s.savedSpiritIds, id] })),
      savedRecipeIds: ['r1','r3','r7','r9','r12','r14'],
      toggleSavedRecipe: (id) => set((s) => ({ savedRecipeIds: s.savedRecipeIds.includes(id) ? s.savedRecipeIds.filter(x => x !== id) : [...s.savedRecipeIds, id] })),
      journalEntries: [],
      addJournalEntry: (entry) => set((s) => ({ journalEntries: [entry, ...s.journalEntries] })),
      barModeVisible: false,
      setBarModeVisible: (v) => set({ barModeVisible: v }),
      authModalVisible: false,
      setAuthModalVisible: (v) => set({ authModalVisible: v }),
      inventoryItems: [],
      shelf0Ids: [],
      shelf1Ids: [],
      setShelf0Ids: (ids) => set({ shelf0Ids: ids }),
      setShelf1Ids: (ids) => set({ shelf1Ids: ids }),
      addInventoryItem: (item) => set((s) => {
        const goToShelf0 = s.shelf0Ids.length <= s.shelf1Ids.length;
        return {
          inventoryItems: [...s.inventoryItems, item],
          shelf0Ids: goToShelf0 ? [...s.shelf0Ids, item.id] : s.shelf0Ids,
          shelf1Ids: goToShelf0 ? s.shelf1Ids : [...s.shelf1Ids, item.id],
        };
      }),
      removeInventoryItem: (id) => set((s) => ({
        inventoryItems: s.inventoryItems.filter(x => x.id !== id),
        shelf0Ids: s.shelf0Ids.filter(x => x !== id),
        shelf1Ids: s.shelf1Ids.filter(x => x !== id),
      })),
      updateInventoryItem: (id, updates) => set((s) => ({
        inventoryItems: s.inventoryItems.map(x => x.id === id ? { ...x, ...updates } : x),
      })),
      customRecipes: [],
      addCustomRecipe: (r) => set((s) => ({ customRecipes: [...s.customRecipes, r] })),
      seedInjected: false,
      setSeedInjected: (v) => set({ seedInjected: v }),
      barName:        'OntheRock',
      setBarName:        (v) => set({ barName: v }),
      myBarBio:       '',
      setMyBarBio:       (v) => set({ myBarBio: v }),
      barNeonColor:   NEON_PINK_PURPLE,
      setBarNeonColor:   (v) => set({ barNeonColor: v }),
      barWallThemeId: 'wood' as WallThemeId,
      setBarWallThemeId: (v) => set({ barWallThemeId: v }),
      barLightColor:  '#ffd060',
      setBarLightColor:  (v) => set({ barLightColor: v }),
      barShelfThemeId:   'oak' as ShelfThemeId,
      setBarShelfThemeId:   (v) => set({ barShelfThemeId: v }),
      barCounterThemeId: 'marble' as CounterThemeId,
      setBarCounterThemeId: (v) => set({ barCounterThemeId: v }),
      barPlayerStyleId:  'cd' as PlayerStyleId,
      setBarPlayerStyleId:  (v) => set({ barPlayerStyleId: v }),
      barPlayerColorId:  'classic' as PlayerColorId,
      setBarPlayerColorId:  (v) => set({ barPlayerColorId: v }),
      userPoints:           0,
      unlockedPremiumIds:   [],
      cocktailAttemptDates: {},
      notePointsEarned:     {},
      earnPoints: (n) => set((s) => ({ userPoints: s.userPoints + n })),
      unlockPremium: (id, cost) => {
        const { userPoints, unlockedPremiumIds } = useAppStore.getState();
        if (userPoints < cost || unlockedPremiumIds.includes(id)) return false;
        useAppStore.setState({ userPoints: userPoints - cost, unlockedPremiumIds: [...unlockedPremiumIds, id] });
        return true;
      },
      logCocktailAttempt: (itemId) => set((s) => {
        const today = new Date().toISOString().slice(0, 10);
        if (s.cocktailAttemptDates[itemId] === today) return {};
        return {
          userPoints: s.userPoints + 10,
          cocktailAttemptDates: { ...s.cocktailAttemptDates, [itemId]: today },
          inventoryItems: s.inventoryItems.map(x =>
            x.id === itemId ? { ...x, cocktailAttempts: (x.cocktailAttempts ?? 0) + 1 } : x
          ),
        };
      }),
      awardNotePoints: (itemId) => set((s) => {
        if (s.notePointsEarned[itemId]) return {};
        return { userPoints: s.userPoints + 5, notePointsEarned: { ...s.notePointsEarned, [itemId]: true } };
      }),
    }),
    {
      name: 'ontherock-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lang: state.lang,
        theme: state.theme,
        savedBarIds: state.savedBarIds,
        savedSpiritIds: state.savedSpiritIds,
        savedRecipeIds: state.savedRecipeIds,
        journalEntries: state.journalEntries,
        inventoryItems: state.inventoryItems,
        shelf0Ids: state.shelf0Ids,
        shelf1Ids: state.shelf1Ids,
        customRecipes: state.customRecipes,
        seedInjected: state.seedInjected,
        barName: state.barName,
        barNeonColor: state.barNeonColor,
        barWallThemeId: state.barWallThemeId,
        barLightColor: state.barLightColor,
        barShelfThemeId: state.barShelfThemeId,
        barCounterThemeId: state.barCounterThemeId,
        barPlayerStyleId: state.barPlayerStyleId,
        barPlayerColorId: state.barPlayerColorId,
        userPoints:           state.userPoints,
        unlockedPremiumIds:   state.unlockedPremiumIds,
        cocktailAttemptDates: state.cocktailAttemptDates,
        notePointsEarned:     state.notePointsEarned,
      }),
    }
  )
);

interface MixSelection {
  ingredientId: string;
  parts: number;
}
interface MixStore {
  selections: MixSelection[];
  iceCount: number;
  iceType: IceType;
  glassType: GlassType;
  addPart: (id: string) => void;
  removePart: (id: string) => void;
  removeIngredient: (id: string) => void;
  setIceCount: (count: number | ((prev: number) => number)) => void;
  setIceType: (t: IceType) => void;
  setGlassType: (glass: GlassType) => void;
  clear: () => void;
}
const useMixStore = create<MixStore>((set) => ({
  selections: [],
  iceCount: 3,
  iceType: 'none',
  glassType: 'rocks',
  addPart: (id) => set((s) => {
    const idx = s.selections.findIndex(x => x.ingredientId === id);
    if (idx > -1) {
      const next = [...s.selections];
      next[idx] = { ...next[idx], parts: Math.min(10, next[idx].parts + 1) };
      return { selections: next };
    } else {
      return { selections: [...s.selections, { ingredientId: id, parts: 1 }] };
    }
  }),
  removePart: (id) => set((s) => {
    const idx = s.selections.findIndex(x => x.ingredientId === id);
    if (idx === -1) return s;
    const next = [...s.selections];
    if (next[idx].parts > 1) {
      next[idx] = { ...next[idx], parts: next[idx].parts - 1 };
      return { selections: next };
    } else {
      return { selections: s.selections.filter(x => x.ingredientId !== id) };
    }
  }),
  removeIngredient: (id) => set((s) => ({
    selections: s.selections.filter(x => x.ingredientId !== id)
  })),
  setIceCount: (count) => set((s) => ({
    iceCount: typeof count === 'function' ? count(s.iceCount) : count
  })),
  setIceType: (t) => set({ iceType: t }),
  setGlassType: (glass) => set({ glassType: glass }),
  clear: () => set({ selections: [], iceCount: 3, iceType: 'none', glassType: 'rocks' }),
}));

function useSelectedIngredients() {
  const { selections } = useMixStore();
  const { inventoryItems } = useAppStore();
  
  return useMemo(() => {
    const baseIngredients: MixIngredient[] = inventoryItems.map(item => ({
      id: item.id,
      name: item.brand || item.name,
      nameKo: item.brand || item.name,
      type: 'Base',
      color: item.spiritType === 'whiskey' ? '#d07818' :
             item.spiritType === 'gin' ? '#bce0f0' :
             item.spiritType === 'vodka' ? '#e0f0ff' :
             item.spiritType === 'rum' ? '#ebdca5' :
             item.spiritType === 'tequila' ? '#ebf5db' :
             item.spiritType === 'brandy' ? '#b05810' : '#ffffff',
      baseProfile: item.profile,
      role: 'base',
      abv: item.abv || 40,
      sugar: 1,
      acid: 0,
    }));
    
    const all = [...baseIngredients, ...PANTRY_INGREDIENTS];
    
    return selections
      .map(sel => all.find(x => x.id === sel.ingredientId))
      .filter((x): x is MixIngredient => x !== undefined);
  }, [selections, inventoryItems]);
}

// ─────────────────────────────────────────────────────────────────
// THEME HOOKS
// ─────────────────────────────────────────────────────────────────
function useColors(): Colors {
  const { theme } = useAppStore();
  return theme === 'dark' ? DARK_C : LIGHT_C;
}
function useStyles() {
  const { theme } = useAppStore();
  return theme === 'dark' ? darkStyles : lightStyles;
}
function useIsDark(): boolean {
  const { theme } = useAppStore();
  return theme === 'dark';
}

// ─────────────────────────────────────────────────────────────────
// BGM BUTTON
// ─────────────────────────────────────────────────────────────────
function useBgmToggle() {
  return useCallback(async () => {
    const { bgmPlaying, setBgmPlaying, bgmLoading, setBgmLoading, bgmMoodIdx, lang } =
      useAppStore.getState();
    if (bgmLoading) return;
    if (!bgmPlaying) {
      setBgmPlaying(true);
      setBgmLoading(true);
      const success = await _bgmStart(BGM_TRACKS[bgmMoodIdx].url);
      setBgmLoading(false);
      if (!success) {
        setBgmPlaying(false);
        Alert.alert(
          lang === 'ko' ? '알림' : 'Notification',
          lang === 'ko' ? 'BGM 스트리밍을 불러오지 못했습니다. 네트워크 상태를 확인해 주세요.' : 'Failed to load the BGM stream. Please check your network connection.'
        );
      } else if (!useAppStore.getState().bgmPlaying) {
        // bgmPlaying이 로딩 중에 외부에서 false로 변경된 경우 오디오도 즉시 정지
        _bgmStop();
      }
    } else {
      setBgmPlaying(false);
      await _bgmStop();
    }
  }, []);
}

// ─────────────────────────────────────────────────────────────────
function BGMButton() {
  const { bgmPlaying, setBgmPlaying, bgmLoading, setBgmLoading, bgmMoodIdx, setBgmMoodIdx, lang } = useAppStore();
  const C      = useColors();
  const isDark = useIsDark();
  const styles = useStyles();
  const toggleBgm = useBgmToggle();
  const [expanded, setExpanded] = useState(false);

  const ICON_W     = 40;
  const EXPANDED_W = 162;

  const widthAnim   = useRef(new Animated.Value(ICON_W)).current;
  const infoOpacity = useRef(new Animated.Value(0)).current;
  const wBar1 = useRef(new Animated.Value(0.2)).current;
  const wBar2 = useRef(new Animated.Value(0.2)).current;
  const wBar3 = useRef(new Animated.Value(0.2)).current;

  // Expand/collapse on expanded state change
  useEffect(() => {
    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: expanded ? EXPANDED_W : ICON_W,
        useNativeDriver: false, friction: 8, tension: 80,
      }),
      Animated.timing(infoOpacity, {
        toValue: expanded ? 1 : 0,
        duration: expanded ? 180 : 80,
        delay:    expanded ? 220 : 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [expanded, widthAnim, infoOpacity]);

  // Animate waveform bars while playing
  useEffect(() => {
    if (bgmPlaying) {
      const mkWave = (bar: Animated.Value, peak: number, dur: number, delay: number) =>
        Animated.loop(Animated.sequence([
          Animated.delay(delay),
          Animated.timing(bar, { toValue: peak, duration: dur, useNativeDriver: true }),
          Animated.timing(bar, { toValue: 0.2,  duration: dur, useNativeDriver: true }),
        ]));
      const w1 = mkWave(wBar1, 1.0, 310, 0);
      const w2 = mkWave(wBar2, 1.0, 260, 110);
      const w3 = mkWave(wBar3, 1.0, 350, 210);
      w1.start(); w2.start(); w3.start();
      return () => {
        w1.stop(); w2.stop(); w3.stop();
        wBar1.setValue(0.2); wBar2.setValue(0.2); wBar3.setValue(0.2);
      };
    }
  }, [bgmPlaying, wBar1, wBar2, wBar3]);

  const handlePress = useCallback(async () => {
    const playing = useAppStore.getState().bgmPlaying;
    if (!playing) setExpanded(true);
    else setExpanded(false);
    await toggleBgm();
  }, [toggleBgm]);

  // Sync expanded with bgmPlaying so CD player also opens/closes the panel
  useEffect(() => {
    setExpanded(bgmPlaying);
  }, [bgmPlaying]);

  // Long-press: cycle mood (restarts stream if playing)
  const handleLongPress = useCallback(async () => {
    if (bgmLoading) return;
    const next = ((bgmMoodIdx + 1) % BGM_TRACKS.length) as BgmMoodIdx;
    setBgmMoodIdx(next);
    if (bgmPlaying) {
      setBgmLoading(true);
      await _bgmUnload();
      const success = await _bgmStart(BGM_TRACKS[next].url);
      setBgmLoading(false);
      if (!success) {
        setBgmPlaying(false);
        setExpanded(false);
        Alert.alert(
          lang === 'ko' ? '알림' : 'Notification',
          lang === 'ko' ? 'BGM 스트리밍을 불러오지 못했습니다. 네트워크 상태를 확인해 주세요.' : 'Failed to load the BGM stream. Please check your network connection.'
        );
      }
    }
  }, [bgmLoading, bgmMoodIdx, bgmPlaying, setBgmMoodIdx, setBgmPlaying, setBgmLoading, lang]);

  const track     = BGM_TRACKS[bgmMoodIdx];
  const playColor = isDark ? '#f0d0ff' : C.accent;
  const iconColor = bgmPlaying ? playColor : C.textDim;
  const borderClr = bgmPlaying ? (isDark ? `${NEON_PINK_PURPLE}90` : `${C.accent}cc`) : C.border;
  const icon      = bgmPlaying ? '♫' : '♩';

  return (
    <TouchableOpacity onPress={handlePress} onLongPress={handleLongPress} delayLongPress={500} activeOpacity={0.75}>
      <Animated.View style={{
        width: widthAnim, height: 34,
        borderRadius: 8, borderWidth: 1, borderColor: borderClr,
        backgroundColor: C.surface, overflow: 'hidden',
      }}>
        {/* Info panel — absolutely positioned, padded right to not overlap icon */}
        <Animated.View style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, right: ICON_W,
          opacity: infoOpacity, paddingLeft: 12,
          flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <Text style={[styles.bgmBtnLabel, { color: playColor }]} numberOfLines={1}>
            {track.label}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {([wBar1, wBar2, wBar3] as Animated.Value[]).map((bar, i) => (
              <Animated.View key={i} style={{
                width: 2, height: 10, borderRadius: 1,
                backgroundColor: playColor, transform: [{ scaleY: bar }],
              }} />
            ))}
          </View>
        </Animated.View>
        {/* Icon — absolutely centered in right 40px slot, always */}
        <View style={{
          position: 'absolute', right: 0, top: 0,
          width: ICON_W, height: 34,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={[styles.bgmBtnIcon, { color: iconColor }]}>{icon}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}


// ─────────────────────────────────────────────────────────────────
// TAB ICONS  (SVG path-based)
// ─────────────────────────────────────────────────────────────────
function TabIcon({ name, color, size, focused }: { name: string; color: string; size: number; focused: boolean }) {
  const sw = focused ? 2.6 : 2;
  switch (name) {
    case 'Home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* House shape — filled when active */}
          <Path
            d="M3 11.5L12 3L21 11.5V21H15.5V15.5H8.5V21H3V11.5Z"
            fill={focused ? color : 'none'}
            stroke={color}
            strokeWidth={focused ? 0 : sw}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'Mix':
      // Martini / cocktail glass
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 4H20L13 13V19H15V21H9V19H11V13L4 4Z" stroke={color} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
          {/* olive / garnish dot */}
          <Circle cx="15.5" cy="7.5" r={focused ? 1.8 : 1.4} fill={color} />
        </Svg>
      );
    case 'Explore':
      // Compass
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={sw} />
          {/* North needle (filled) */}
          <Path d="M12 5L14.5 12H9.5L12 5Z" fill={color} />
          {/* South needle (outline) */}
          <Path d="M12 19L9.5 12H14.5L12 19Z" fill={focused ? color : 'none'} stroke={color} strokeWidth={1.2} strokeLinejoin="round" />
        </Svg>
      );
    case 'Search':
      // Magnifying glass matching reference image
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={sw} />
          <Path d="M17 17L21.5 21.5" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case 'Profile':
      // Person silhouette
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={sw} fill={focused ? color : 'none'} />
          <Path d="M4 21C4 17.134 7.582 14 12 14C16.418 14 20 17.134 20 21"
            stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// FLOATING PILL TAB BAR
// ─────────────────────────────────────────────────────────────────
function FloatingTabBar({ activeIdx, onPress }: { activeIdx: number; onPress: (idx: number) => void }) {
  const C      = useColors();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();

  const barBg    = isDark ? 'rgba(14,14,24,0.96)' : 'rgba(246,242,237,0.96)';
  const activeBg = isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={{
      backgroundColor:   'transparent',
      paddingHorizontal: TAB_PILL_MX,
      paddingBottom:     insets.bottom + TAB_PILL_BOT,
      paddingTop:        8,
    }}>
      <View style={{
        height:            TAB_PILL_H,
        flexDirection:     'row',
        backgroundColor:   barBg,
        borderRadius:      TAB_PILL_H / 2,
        borderWidth:       1,
        borderColor:       isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        shadowColor:       '#000',
        shadowOffset:      { width: 0, height: 8 },
        shadowOpacity:     isDark ? 0.55 : 0.14,
        shadowRadius:      20,
        elevation:         14,
        alignItems:        'center',
        paddingHorizontal: 6,
      }}>
        {TAB_NAMES.map((name, index) => {
          const focused = activeIdx === index;
          return (
            <TouchableOpacity
              key={name}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => onPress(index)}
              style={{
                flex:             1,
                height:           TAB_PILL_H - 12,
                alignItems:       'center',
                justifyContent:   'center',
                borderRadius:     (TAB_PILL_H - 12) / 2,
                backgroundColor:  focused ? activeBg : 'transparent',
                marginHorizontal: 2,
              }}
            >
              <TabIcon name={name} color={focused ? C.text : C.textDim} size={24} focused={focused} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SLIDING TAB CONTAINER  (swipe-between-screens)
// ─────────────────────────────────────────────────────────────────
const SCREEN_COMPONENTS = [
  HomeScreen, MixScreen, ExploreScreen, SearchScreen, ProfileScreen,
] as const;

// ─────────────────────────────────────────────────────────────────
// HOME SCREEN ECHO  (visual-only replica for the left rubber-band zone)
// ─────────────────────────────────────────────────────────────────
function HomeScreenEcho() {
  const { lang, theme, bgmPlaying, homeCabH, inventoryItems, barShelfThemeId } = useAppStore();
  const C      = useColors();
  const isDark = useIsDark();
  const styles = useStyles();
  const t      = TEXTS[lang];
  const hour   = new Date().getHours();
  const ledGlow = isDark ? 'rgba(255,145,20,0.68)' : 'rgba(180,110,0,0.30)';
  const ledFade = isDark ? 'rgba(255,145,20,0.10)' : 'rgba(180,110,0,0.09)';
  const echoSt   = BAR_SHELF_THEMES.find(t => t.id === barShelfThemeId) ?? BAR_SHELF_THEMES[0];
  const echoShelf = isDark ? echoSt.dark     : echoSt.light;
  const echoEdge  = isDark ? echoSt.darkEdge : echoSt.lightEdge;

  const shelfPlanks = useMemo(
    () => SHELF_FRACS.map(f => Math.round(homeCabH * f)),
    [homeCabH],
  );

  return (
    <View style={styles.home} pointerEvents="none">
      <SafeAreaView edges={['top']} style={styles.homeHeaderSafe}>
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.homeGreeting}>{t.greeting(hour)}</Text>
            <Text style={styles.homeAtmo}>{t.atmosphere(hour)}</Text>
          </View>
          <View style={styles.headerBtns}>
            {/* Static replica of BGMButton */}
            <View style={{
              width: 40, height: 34,
              borderRadius: 8, borderWidth: 1,
              borderColor: bgmPlaying ? (isDark ? `${NEON_PINK_PURPLE}90` : `${C.accent}cc`) : C.border,
              backgroundColor: C.surface,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={[styles.bgmBtnIcon, { color: bgmPlaying ? (isDark ? '#f0d0ff' : C.accent) : C.textDim }]}>
                {bgmPlaying ? '♫' : '♩'}
              </Text>
            </View>
            <View style={styles.themeBtn}>
              <Text style={styles.themeBtnTxt}>{theme === 'dark' ? '☼' : '☾'}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.homeCount}>{t.barCount(inventoryItems.length)}</Text>
      </SafeAreaView>

      <View style={styles.cabinetArea}>
        <BarWall />
        <ShelfPendantLights cabH={homeCabH} />
        {homeCabH > 0 && shelfPlanks.map((plankY, i) => (
          <React.Fragment key={i}>
            <View style={{ position: 'absolute', top: plankY - 3, left: SHELF_MX, right: SHELF_MX, height: 3, backgroundColor: ledGlow }} />
            <View style={{ position: 'absolute', top: plankY,     left: SHELF_MX, right: SHELF_MX, height: 8, backgroundColor: ledFade }} />
            <View style={{ position: 'absolute', top: plankY + 3, left: SHELF_MX, right: SHELF_MX, height: PLANK_H + 6,
              backgroundColor: echoShelf, borderTopWidth: 2, borderTopColor: echoEdge }} />
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

function SlidingTabContainer() {
  const C = useColors();
  const [activeIdx, setActiveIdx] = useState(0);

  // Master horizontal offset animated value (non-native, needs setValue)
  const slideX  = useRef(new Animated.Value(0)).current;
  const idxRef  = useRef(0); // always mirrors activeIdx without closure staleness

  // Pre-computed per-screen base offsets (never change)
  const baseOffsets = useRef(
    TAB_NAMES.map((_, i) => new Animated.Value(i * SCREEN_W))
  ).current;

  // Derived animated transforms: each screen stays at its own offset + slideX
  const screenTranslates = useRef(
    TAB_NAMES.map((_, i) => Animated.add(slideX, baseOffsets[i]))
  ).current;

  // Echo panel sits one screen-width to the left of Home (index 0)
  const leftEchoTranslate = useRef(
    Animated.add(slideX, new Animated.Value(-SCREEN_W))
  ).current;

  const goTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(TAB_NAMES.length - 1, idx));
    idxRef.current = clamped;
    setActiveIdx(clamped);
    Animated.spring(slideX, {
      toValue:         -clamped * SCREEN_W,
      tension:         120,
      friction:        22,
      useNativeDriver: false,  // must match setValue calls above
    }).start();
  }, [slideX]);

  const panResponder = useRef(PanResponder.create({
    // Only claim gestures that are clearly horizontal.
    // Fallback: block any gesture starting inside the cabinet area on the home screen
    // (primary blocking is handled per-ShelfRow via blockTabSwipe PanResponder).
    onMoveShouldSetPanResponder: (_, gs) => {
      if (idxRef.current === 0) {
        const { homeCabTop, homeCabH } = useAppStore.getState();
        if (homeCabTop > 0 && homeCabH > 0 &&
            gs.y0 >= homeCabTop && gs.y0 < homeCabTop + homeCabH) {
          return false;
        }
        // 홈(첫 탭): 오른쪽 드래그(왼쪽 슬라이드) 제스처 수락 안 함
        if (gs.dx > 6) return false;
      }
      // 프로필(마지막 탭): 왼쪽 드래그(오른쪽 슬라이드) 제스처 수락 안 함
      if (idxRef.current === TAB_NAMES.length - 1 && gs.dx < -6) return false;
      return Math.abs(gs.dx) > 6 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2;
    },

    onPanResponderMove: (_, gs) => {
      const base = -idxRef.current * SCREEN_W;
      const minX = -(TAB_NAMES.length - 1) * SCREEN_W;
      let newX = base + gs.dx;
      // 양 끝 탭에서는 고무줄 없이 하드 클램프
      if (newX > 0)    newX = 0;
      if (newX < minX) newX = minX;
      slideX.setValue(newX);
    },

    onPanResponderRelease: (_, gs) => {
      const DIST = SCREEN_W * 0.26;   // distance threshold
      const VEL  = 0.45;              // velocity threshold
      const cur  = idxRef.current;
      if      (gs.dx < -DIST || gs.vx < -VEL) goTo(cur + 1);
      else if (gs.dx >  DIST || gs.vx >  VEL) goTo(cur - 1);
      else                                     goTo(cur);      // snap back
    },

    // Capture phase — fires outer→inner, beats the vertical feed ScrollView on Explore tab.
    onMoveShouldSetPanResponderCapture: (_, gs) => {
      if (idxRef.current !== 2) return false;
      return Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2.5;
    },

    onPanResponderTerminate: () => goTo(idxRef.current),
  })).current;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Clipping area — pan handlers live here so bottles inside HomeScreen
          can still capture their own gestures via onStartShouldSetPanResponder */}
      <View style={{ flex: 1, overflow: 'hidden' }} {...panResponder.panHandlers}>
        {/* BarWall fills the right rubber-band gap */}
        <BarWall />

        {/* HomeScreenEcho: full visual replica one screen-width to the left,
            peeks in during right rubber-band from Home */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { transform: [{ translateX: leftEchoTranslate }] }]}
        >
          <HomeScreenEcho />
        </Animated.View>

        {SCREEN_COMPONENTS.map((Screen, i) => (
          <Animated.View
            key={i}
            style={[
              StyleSheet.absoluteFillObject,
              { transform: [{ translateX: screenTranslates[i] }] },
            ]}
          >
            <Screen />
          </Animated.View>
        ))}
      </View>

      {/* Pill bar — in normal layout flow, screens have full height above it */}
      <FloatingTabBar activeIdx={activeIdx} onPress={goTo} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// RADAR CHART
// ─────────────────────────────────────────────────────────────────
const FLAVOR_KEYS: (keyof FlavorP)[] = ['sweet', 'sour', 'bitter', 'body', 'aroma'];

function RadarChart({ profile, labels, size = 200 }: { profile: FlavorP; labels: string[]; size?: number }) {
  const C      = useColors();
  const styles = useStyles();
  const c = size / 2, r = c - 26;
  const pt = (val: number, i: number) => {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return { x: c + (val / 5) * r * Math.cos(a), y: c + (val / 5) * r * Math.sin(a) };
  };
  const dataPts = FLAVOR_KEYS.map((k, i) => pt(profile[k], i));
  const polyStr = dataPts.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <View style={styles.radarWrap}>
      <Svg width={size} height={size}>
        {[1,2,3,4,5].map((lv) => (
          <Polygon key={lv}
            points={FLAVOR_KEYS.map((_,i) => { const p=pt(lv,i); return `${p.x},${p.y}`; }).join(' ')}
            stroke="rgba(128,128,128,0.18)" strokeWidth={1} fill="none" />
        ))}
        {FLAVOR_KEYS.map((_,i) => { const p=pt(5,i); return <Line key={i} x1={c} y1={c} x2={p.x} y2={p.y} stroke="rgba(128,128,128,0.18)" strokeWidth={1} />; })}
        {FLAVOR_KEYS.map((_,i) => { const p=pt(6.1,i); return <SvgText key={`lb${i}`} x={p.x} y={p.y} fill={C.textDim} fontSize={10} textAnchor="middle" alignmentBaseline="middle">{labels[i]}</SvgText>; })}
        <Polygon points={polyStr} fill={`${C.primary}30`} stroke={C.primary} strokeWidth={2} />
        {dataPts.map((p,i) => <Circle key={`d${i}`} cx={p.x} cy={p.y} r={3} fill={C.text} />)}
      </Svg>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// NEON TEXT
// ─────────────────────────────────────────────────────────────────
function NeonText({ text, color, size, script = false }: {
  text: string; color: string; size: number; script?: boolean;
}) {
  const styles = useStyles();
  const isDark   = useIsDark();
  const txtStyle = script ? styles.neonScript : styles.neonBase;
  const absLayer: object = { position: 'absolute', top: 0, left: 0, right: 0, textAlign: 'center' };
  const shadow = (r: number) => ({ textShadowColor: color, textShadowRadius: r, textShadowOffset: { width: 0, height: 0 } });

  if (!isDark) {
    return (
      <View style={styles.neonWrap}>
        <Text style={[txtStyle, { fontSize: size, color: 'transparent', ...shadow(18) }]}>{text}</Text>
        <Text style={[txtStyle, { fontSize: size, color, ...shadow(7), ...absLayer }]}>{text}</Text>
      </View>
    );
  }

  // Dark mode: white outer glow + purple core
  const wShadow = (r: number) => ({ textShadowColor: '#ffffff', textShadowRadius: r, textShadowOffset: { width: 0, height: 0 } });
  return (
    <View style={styles.neonWrap}>
      {/* White outer halo — massive spread */}
      <Text style={[txtStyle, { fontSize: size, color: 'transparent', ...wShadow(240) }]}>{text}</Text>
      {/* White mid glow */}
      <Text style={[txtStyle, { fontSize: size, color: 'transparent', ...wShadow(100), ...absLayer }]}>{text}</Text>
      {/* White tight outer edge */}
      <Text style={[txtStyle, { fontSize: size, color: 'transparent', ...wShadow(28), ...absLayer }]}>{text}</Text>
      {/* Purple inner glow */}
      <Text style={[txtStyle, { fontSize: size, color: 'transparent', ...shadow(40), ...absLayer }]}>{text}</Text>
      {/* Purple fill core */}
      <Text style={[txtStyle, { fontSize: size, color, ...shadow(10), ...absLayer }]}>{text}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// BAR WALL
// ─────────────────────────────────────────────────────────────────
function BarWall() {
  const styles = useStyles();
  const isDark = useIsDark();
  const { barName, barNeonColor, barWallThemeId } = useAppStore();

  const wallTheme = BAR_WALL_THEMES.find(t => t.id === barWallThemeId) ?? BAR_WALL_THEMES[0];
  const wallBg    = isDark ? wallTheme.darkBg : wallTheme.lightBg;
  const signColor = barNeonColor;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: wallBg }]} pointerEvents="none">
      <View style={[styles.grainLine, { top: '14%' }]} />
      <View style={[styles.grainLine, { top: '38%' }]} />
      <View style={[styles.grainLine, { top: '62%' }]} />

      <View style={styles.signArea}>
        <View style={styles.signFrame}>
          <View style={[styles.signRule, { borderColor: `${signColor}45` }]} />
          <View style={{ height: 12 }} />
          <NeonText text={barName} color={signColor} size={52} script />
          <Text style={[styles.signEst, { color: `${signColor}70` }]}>EST. 2025</Text>
          <View style={{ height: 12 }} />
          <View style={[styles.signRule, { borderColor: `${signColor}38` }]} />
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SHELF BOTTLE  (pure display — PanResponder lives on the bottles container in ShelfRow)
// ─────────────────────────────────────────────────────────────────
function ShelfBottle({ item, isFocused, isAnyFocused,
                       isDragging, isAnyDragging, sharedDragAnim }: {
  item: InventoryItem;
  isFocused: boolean; isAnyFocused: boolean;
  isDragging: boolean; isAnyDragging: boolean;
  sharedDragAnim: Animated.ValueXY;
}) {
  const imgH   = Math.round(BOTTLE_H * 0.87);
  const imgUri = `https://www.thecocktaildb.com/images/ingredients/${item.apiName}-Medium.png`;

  const opacityAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const zeroAnim    = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    const targetOpacity = isAnyDragging && !isDragging ? 0.35
      : isAnyFocused && !isFocused ? 0.28 : 1;
    const targetScale = isDragging ? 1.14
      : isFocused ? 1.08 : isAnyFocused ? 0.88 : 1;
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: targetOpacity, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim,   { toValue: targetScale,   duration: 200, useNativeDriver: true }),
    ]).start();
  }, [isDragging, isAnyDragging, isFocused, isAnyFocused]);

  const animXY = isDragging ? sharedDragAnim : zeroAnim;

  return (
    <View style={{
      width: SLOT_W, height: BOTTLE_H,
      zIndex: isDragging ? 100 : 1,
      elevation: isDragging ? 20 : 1,
      overflow: 'visible',
    }}>
      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
        transform: [{ translateX: animXY.x }, { translateY: animXY.y }, { scale: scaleAnim }],
      }}>
        <Animated.View style={{
          position: 'absolute', bottom: 0, alignSelf: 'center',
          width: BOTTLE_W, height: imgH,
          opacity: opacityAnim,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: isDragging ? 18 : 6 },
          shadowOpacity: isDragging ? 0.70 : 0.40,
          shadowRadius: isDragging ? 22 : 12,
        }}>
          <ExpoImage source={{ uri: imgUri }} style={{ width: BOTTLE_W, height: imgH }} contentFit="contain" transition={200} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// WOOD PLANK
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// SHELF PENDANT LIGHTS  (fixture always visible; light effects dark-mode only)
// ─────────────────────────────────────────────────────────────────
function ShelfPendantLights({ cabH }: { cabH: number }) {
  const isDark = useIsDark();
  const { barLightColor } = useAppStore();
  if (cabH === 0) return null;

  const shelfW   = SCREEN_W - SHELF_MX * 2;
  const planks   = SHELF_FRACS.map(f => Math.round(cabH * f));
  const pxLeft   = SHELF_MX + Math.round(shelfW * 0.28);
  const pxRight  = SHELF_MX + Math.round(shelfW * 0.72);

  // Derive bulb glow tint from the chosen light color
  const lc = barLightColor;
  const bulbBg     = isDark ? '#fff8d0' : '#e0d9c4';
  const bulbShadow = isDark ? lc : 'transparent';
  const bulbShadowOp = isDark ? 0.55 : 0;
  const cordColor  = isDark ? 'rgba(140,120,80,0.50)' : 'rgba(100,90,70,0.40)';

  return (
    <>
      {planks.map((plankY, si) => {
        const bulbY  = plankY - BOTTLE_H - 16;
        const coneH  = BOTTLE_H + 16;
        const coneHW = Math.round(shelfW * 0.32);

        return [pxLeft, pxRight].map((px, pi) => {
          const id = `cone_${si}_${pi}`;

          return (
            <React.Fragment key={id}>
              {/* Cord */}
              <View style={{
                position: 'absolute', top: 0, left: px - 1,
                width: 2, height: bulbY + 6,
                backgroundColor: cordColor,
              }} pointerEvents="none" />

              {/* Light cone: dark mode only */}
              {isDark && (
                <Svg
                  width={coneHW * 2} height={coneH}
                  style={{ position: 'absolute', top: bulbY + 2, left: px - coneHW }}
                  pointerEvents="none"
                >
                  <Defs>
                    <RadialGradient
                      id={id}
                      cx={coneHW} cy={0} r={coneH}
                      fx={coneHW} fy={0}
                      gradientUnits="userSpaceOnUse"
                    >
                      <Stop offset="0"    stopColor={lc} stopOpacity={0.30} />
                      <Stop offset="0.35" stopColor={lc} stopOpacity={0.12} />
                      <Stop offset="0.70" stopColor={lc} stopOpacity={0.04} />
                      <Stop offset="1"    stopColor={lc} stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Ellipse cx={coneHW} cy={0} rx={coneHW} ry={coneH} fill={`url(#${id})`} />
                </Svg>
              )}

              {/* Bulb fixture: on (warm glow) in dark, off (grey matte) in light */}
              <View style={{
                position: 'absolute', top: bulbY - 5, left: px - 9,
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: bulbBg,
                shadowColor: bulbShadow, shadowRadius: 22,
                shadowOpacity: bulbShadowOp, shadowOffset: { width: 0, height: 4 },
                elevation: isDark ? 8 : 2,
              }} pointerEvents="none" />
              {/* Inner core: bright white (on) or warm amber-grey filament (off) */}
              <View style={{
                position: 'absolute', top: bulbY - 1, left: px - 5,
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: isDark ? '#ffffff' : '#bfb89e',
                shadowColor: isDark ? '#ffffff' : 'transparent',
                shadowRadius: 6, shadowOpacity: isDark ? 0.50 : 0,
                shadowOffset: { width: 0, height: 0 },
              }} pointerEvents="none" />
            </React.Fragment>
          );
        });
      })}
    </>
  );
}

function WoodPlank({ shelfW, shelfThemeId: shelfThemeIdProp }: { shelfW: number; shelfThemeId?: ShelfThemeId }) {
  const isDark = useIsDark();
  const { barShelfThemeId } = useAppStore();
  const st      = BAR_SHELF_THEMES.find(t => t.id === (shelfThemeIdProp ?? barShelfThemeId)) ?? BAR_SHELF_THEMES[0];
  const shelfBg = isDark ? st.dark      : st.light;
  const shelfEg = isDark ? st.darkEdge  : st.lightEdge;
  const grainA  = isDark ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.12)';
  const grainB  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.22)';
  const edge    = isDark ? '#090806' : '#8a7040';
  return (
    <View style={{
      height: PLANK_H + 6,
      shadowColor: '#000',
      shadowOffset:  { width: 0, height: 7 },
      shadowOpacity: isDark ? 0.75 : 0.38,
      shadowRadius:  10,
      elevation: 10,
    }}>
      <View style={{ height: PLANK_H, backgroundColor: shelfBg,
        borderTopWidth: 2, borderTopColor: shelfEg, overflow: 'hidden' }}>
        <Svg style={StyleSheet.absoluteFill} width={shelfW} height={PLANK_H} pointerEvents="none">
          {[0.20, 0.42, 0.62, 0.82].map((p, i) => (
            <Line key={`h${i}`}
              x1={0}      y1={PLANK_H * p}
              x2={shelfW} y2={PLANK_H * p + 1.5}
              stroke={i % 2 === 0 ? grainA : grainB} strokeWidth={1} />
          ))}
          <Line x1={shelfW * 0.13} y1={0} x2={shelfW * 0.20} y2={PLANK_H} stroke={grainA} strokeWidth={0.8} />
          <Line x1={shelfW * 0.46} y1={0} x2={shelfW * 0.53} y2={PLANK_H} stroke={grainA} strokeWidth={0.8} />
          <Line x1={shelfW * 0.76} y1={0} x2={shelfW * 0.81} y2={PLANK_H} stroke={grainB} strokeWidth={0.8} />
        </Svg>
      </View>
      <View style={{ height: 6, backgroundColor: edge }} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SHELF ROW  (margins + wood plank flush with bottles)
// Each ShelfRow manages its own horizontal page-slide independently.
// PanResponder lives on a plain overlay View (not the Animated.View) so that
// Android hit areas are always at the correct screen position.
// ─────────────────────────────────────────────────────────────────
function ShelfRow({ plankY, items, focusedId, onTapBottle, draggingId, onDragStart, onDragEnd }: {
  plankY: number; items: InventoryItem[];
  focusedId: string | null; onTapBottle: (item: InventoryItem) => void;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: (id: string, slotDelta: number) => void;
}) {
  const isDark = useIsDark();
  const shelfW = SCREEN_W - SHELF_MX * 2;

  const sharedDragAnim  = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const touchItemRef    = useRef<InventoryItem | null>(null);
  const isDraggingRef   = useRef(false);
  const isSlidingRef    = useRef(false);
  const itemsRef        = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // Per-shelf slide state — all useRef so PanResponder closure can access latest values
  const shelfSlideAnim  = useRef(new Animated.Value(0)).current;
  const shelfSwipeState = useRef({ page: 0 });
  const pageCountRef    = useRef(1);
  const [shelfPage, setShelfPage] = useState(0);

  // Update pageCount every render so PanResponder reads the latest value via .current
  pageCountRef.current = Math.max(1, Math.ceil(items.length / SLOT_COUNT));

  const cbRef = useRef({ onDragStart, onDragEnd, onTapBottle });
  useEffect(() => { cbRef.current = { onDragStart, onDragEnd, onTapBottle }; });

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (_, gs) => {
      // gs.x0 = absolute screen X — reliable on both iOS and Android.
      const localX      = gs.x0 - SHELF_MX;
      const slotInPage  = Math.floor(localX / SLOT_W);
      const fullSlotIdx = shelfSwipeState.current.page * SLOT_COUNT + slotInPage;
      touchItemRef.current  = itemsRef.current[fullSlotIdx] ?? null;
      isDraggingRef.current = false;
      isSlidingRef.current  = false;
      sharedDragAnim.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: (_, gs) => {
      if (isSlidingRef.current) {
        const { page } = shelfSwipeState.current;
        const mp = pageCountRef.current - 1;
        shelfSlideAnim.setValue(Math.max(-mp * PAGE_W, Math.min(0, -page * PAGE_W + gs.dx)));
        return;
      }
      if (!isDraggingRef.current) {
        if (Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy)) {
          if (!touchItemRef.current) {
            isSlidingRef.current = true;
            const { page } = shelfSwipeState.current;
            const mp = pageCountRef.current - 1;
            shelfSlideAnim.setValue(Math.max(-mp * PAGE_W, Math.min(0, -page * PAGE_W + gs.dx)));
            return;
          }
          isDraggingRef.current = true;
          cbRef.current.onDragStart(touchItemRef.current.id);
        }
        return;
      }
      sharedDragAnim.setValue({ x: gs.dx, y: gs.dy * 0.3 });
    },
    onPanResponderRelease: (_, gs) => {
      if (isSlidingRef.current) {
        isSlidingRef.current = false;
        touchItemRef.current = null;
        const { page } = shelfSwipeState.current;
        const mp   = pageCountRef.current - 1;
        const DIST = PAGE_W * 0.25, VEL = 0.4;
        let newPage = page;
        if      (gs.dx < -DIST || gs.vx < -VEL) newPage = Math.min(mp, page + 1);
        else if (gs.dx >  DIST || gs.vx >  VEL) newPage = Math.max(0, page - 1);
        shelfSwipeState.current.page = newPage;
        setShelfPage(newPage);
        Animated.spring(shelfSlideAnim, { toValue: -newPage * PAGE_W, friction: 14, tension: 110, useNativeDriver: true }).start();
        return;
      }
      const wasDragging = isDraggingRef.current;
      const touched     = touchItemRef.current;
      isDraggingRef.current = false;
      touchItemRef.current  = null;
      if (wasDragging && touched) {
        Animated.spring(sharedDragAnim, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 10, tension: 80 })
          .start(() => cbRef.current.onDragEnd(touched.id, Math.round(gs.dx / SLOT_W)));
      } else if (!wasDragging && touched && Math.abs(gs.dx) < 8 && Math.abs(gs.dy) < 8) {
        cbRef.current.onTapBottle(touched);
      }
    },
    onPanResponderTerminate: () => {
      if (isSlidingRef.current) {
        isSlidingRef.current = false;
        Animated.spring(shelfSlideAnim, { toValue: -shelfSwipeState.current.page * PAGE_W, friction: 14, tension: 110, useNativeDriver: true }).start();
      } else if (isDraggingRef.current && touchItemRef.current) {
        sharedDragAnim.setValue({ x: 0, y: 0 });
        cbRef.current.onDragEnd(touchItemRef.current.id, 0);
      }
      isDraggingRef.current = false;
      touchItemRef.current  = null;
    },
    onPanResponderTerminationRequest: () => false,
  })).current;

  const pageCount = pageCountRef.current;

  return (
    <View style={{
      position: 'absolute',
      top: plankY - BOTTLE_H,
      left: SHELF_MX,
      right: SHELF_MX,
      height: BOTTLE_H + PLANK_H + 6,
      overflow: 'visible',
    }}>
      {/* Wood plank */}
      <View style={{ position: 'absolute', top: BOTTLE_H - SHELF_OVERLAP, left: 0, right: 0 }}>
        <WoodPlank shelfW={shelfW} />
      </View>
      {/* LED strip */}
      <Svg
        width={shelfW} height={44}
        style={{ position: 'absolute', top: BOTTLE_H - SHELF_OVERLAP - 3, left: 0 }}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="ledG" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0"    stopColor="#ffcc28" stopOpacity={isDark ? 0.62 : 0.26} />
            <Stop offset="0.08" stopColor="#ff9010" stopOpacity={isDark ? 0.24 : 0.10} />
            <Stop offset="0.40" stopColor="#ff6000" stopOpacity={isDark ? 0.08 : 0.03} />
            <Stop offset="1"    stopColor="#ff3000" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <SvgRect x={0} y={0} width={shelfW} height={44} fill="url(#ledG)" />
      </Svg>
      {/* Wide Animated.View: all pages laid out side-by-side, slides left/right */}
      <Animated.View style={{
        position: 'absolute', top: 0, left: 0,
        width: pageCount * PAGE_W, height: BOTTLE_H,
        flexDirection: 'row', alignItems: 'flex-end',
        overflow: 'visible',
        transform: [{ translateX: shelfSlideAnim }],
      }}>
        {Array.from({ length: pageCount * SLOT_COUNT }).map((_, slotIdx) => {
          const item = items[slotIdx];
          return item ? (
            <ShelfBottle
              key={item.id}
              item={item}
              isFocused={focusedId === item.id}
              isAnyFocused={focusedId !== null}
              isDragging={draggingId === item.id}
              isAnyDragging={draggingId !== null}
              sharedDragAnim={sharedDragAnim}
            />
          ) : (
            <View key={`empty-${slotIdx}`} style={{ width: SLOT_W, height: BOTTLE_H }} />
          );
        })}
      </Animated.View>
      {/* PanResponder overlay: plain View so Android hit area is always at screen position */}
      <View {...panResponder.panHandlers} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: BOTTLE_H }} />
      {/* Page dots — shown only when there are multiple pages */}
      {pageCount > 1 && (
        <View style={{ position: 'absolute', bottom: -14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
          {Array.from({ length: pageCount }).map((_, i) => (
            <View key={i} style={{
              width: shelfPage === i ? 6 : 4, height: shelfPage === i ? 6 : 4,
              borderRadius: 3,
              backgroundColor: shelfPage === i ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.28)',
            }} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// BAR COUNTER DECOR  (counter top + face + bar stools)
// ─────────────────────────────────────────────────────────────────
const COUNTER_SEAT_H = 20;
const COUNTER_TOP_H  = 14;
const COUNTER_FACE_H = 72;
const COUNTER_TOTAL  = COUNTER_SEAT_H + COUNTER_TOP_H + COUNTER_FACE_H;

function BarCounterDecor({ counterThemeId: counterThemeIdProp }: { counterThemeId?: CounterThemeId } = {}) {
  const isDark = useIsDark();
  const { barCounterThemeId } = useAppStore();
  const ct = BAR_COUNTER_THEMES.find(t => t.id === (counterThemeIdProp ?? barCounterThemeId)) ?? BAR_COUNTER_THEMES[0];

  const marbleBase = isDark ? ct.dark    : ct.light;
  const topBase    = isDark ? ct.darkTop : ct.lightTop;
  const veinMain   = isDark ? 'rgba(195,185,168,0.40)' : 'rgba(95,85,75,0.42)';
  const veinBold   = isDark ? 'rgba(215,205,188,0.26)' : 'rgba(65,55,45,0.30)';
  const veinThin   = isDark ? 'rgba(180,170,155,0.28)' : 'rgba(110,100,90,0.30)';
  const topHighlight = isDark ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.72)';

  // Stool colors — chrome legs, padded leather seat
  const seatColor  = isDark ? '#2a1a0e' : '#7a4820';
  const seatSheen  = isDark ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.26)';
  const legColor   = isDark ? '#72728a' : '#a09888';
  const legSheen   = isDark ? 'rgba(255,255,255,0.17)' : 'rgba(255,255,255,0.32)';
  const frstColor  = isDark ? '#62627a' : '#908878';

  const fW = SCREEN_W;
  const fH = COUNTER_FACE_H;   // 72
  const SW = 68;                // stool SVG width
  const stools = [0.21, 0.50, 0.79].map(f => Math.round(SCREEN_W * f));

  // Footrest: 42% down each leg
  const FR = 0.42;
  const legTL = SW * 0.34; const legBL = SW * 0.12;  // left leg x top/bottom
  const legTR = SW * 0.66; const legBR = SW * 0.88;  // right leg x top/bottom
  const legTY = 17; const legBY = COUNTER_FACE_H;   // seat 17px, legs to SVG bottom
  const frLx  = legTL + (legBL - legTL) * FR;
  const frRx  = legTR + (legBR - legTR) * FR;
  const frY   = legTY + (legBY - legTY) * FR;

  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: COUNTER_TOTAL }}>
      {/* Counter face: marble */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: fH,
        backgroundColor: marbleBase, overflow: 'hidden' }}>
        <Svg style={StyleSheet.absoluteFill} width={fW} height={fH}>
          <Path d={`M 0,${fH*0.27} Q ${fW*0.22},${fH*0.17} ${fW*0.43},${fH*0.32} Q ${fW*0.63},${fH*0.48} ${fW},${fH*0.42}`}
            stroke={veinBold} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d={`M ${fW*0.27},${fH*0.25} Q ${fW*0.38},${fH*0.12} ${fW*0.53},${fH*0.05}`}
            stroke={veinMain} strokeWidth={1} fill="none" strokeLinecap="round" />
          <Path d={`M 0,${fH*0.62} Q ${fW*0.29},${fH*0.57} ${fW*0.51},${fH*0.66} Q ${fW*0.73},${fH*0.74} ${fW},${fH*0.68}`}
            stroke={veinMain} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          <Path d={`M ${fW*0.11},0 Q ${fW*0.13},${fH*0.44} ${fW*0.09},${fH}`}
            stroke={veinThin} strokeWidth={0.7} fill="none" strokeLinecap="round" />
          <Path d={`M ${fW*0.56},0 Q ${fW*0.58},${fH*0.34} ${fW*0.54},${fH*0.68} Q ${fW*0.52},${fH*0.84} ${fW*0.56},${fH}`}
            stroke={veinThin} strokeWidth={0.6} fill="none" strokeLinecap="round" />
          <Path d={`M ${fW*0.79},${fH*0.14} Q ${fW*0.81},${fH*0.40} ${fW*0.78},${fH*0.72}`}
            stroke={veinThin} strokeWidth={0.5} fill="none" strokeLinecap="round" />
          <Path d={`M ${fW*0.34},${fH*0.40} Q ${fW*0.37},${fH*0.56} ${fW*0.31},${fH*0.76}`}
            stroke={veinThin} strokeWidth={0.4} fill="none" strokeLinecap="round" />
        </Svg>
      </View>

      {/* Counter top surface: marble with highlight edge */}
      <View style={{ position: 'absolute', bottom: fH, left: 0, right: 0,
        height: COUNTER_TOP_H, backgroundColor: topBase, overflow: 'hidden',
        borderTopWidth: 1.5, borderTopColor: topHighlight,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55, shadowRadius: 6, elevation: 8 }}>
        <Svg style={StyleSheet.absoluteFill} width={fW} height={COUNTER_TOP_H}>
          <Path d={`M 0,${COUNTER_TOP_H*0.40} Q ${fW*0.30},${COUNTER_TOP_H*0.28} ${fW*0.60},${COUNTER_TOP_H*0.50} T ${fW},${COUNTER_TOP_H*0.40}`}
            stroke={veinMain} strokeWidth={0.8} fill="none" />
          <Path d={`M 0,${COUNTER_TOP_H*0.73} Q ${fW*0.40},${COUNTER_TOP_H*0.65} ${fW},${COUNTER_TOP_H*0.76}`}
            stroke={veinThin} strokeWidth={0.5} fill="none" />
        </Svg>
      </View>

      {/* Bar stools: chrome legs + padded seat */}
      {stools.map((cx, i) => (
        <Svg key={i}
          style={{ position: 'absolute', left: cx - SW / 2, top: COUNTER_SEAT_H + COUNTER_TOP_H }}
          width={SW} height={COUNTER_FACE_H}
        >
          {/* Left leg */}
          <Line x1={legTL} y1={legTY} x2={legBL} y2={legBY}
            stroke={legColor} strokeWidth={6} strokeLinecap="round" />
          <Line x1={legTL - 1} y1={legTY} x2={legBL - 1} y2={legBY}
            stroke={legSheen} strokeWidth={2} strokeLinecap="round" />
          {/* Right leg */}
          <Line x1={legTR} y1={legTY} x2={legBR} y2={legBY}
            stroke={legColor} strokeWidth={6} strokeLinecap="round" />
          <Line x1={legTR - 1} y1={legTY} x2={legBR - 1} y2={legBY}
            stroke={legSheen} strokeWidth={2} strokeLinecap="round" />
          {/* Footrest bar */}
          <Line x1={frLx} y1={frY} x2={frRx} y2={frY}
            stroke={frstColor} strokeWidth={5} strokeLinecap="round" />
          <Line x1={frLx} y1={frY - 1} x2={frRx} y2={frY - 1}
            stroke={legSheen} strokeWidth={1.5} strokeLinecap="round" />
          {/* Base feet */}
          <Circle cx={legBL} cy={legBY - 4} r={5} fill={legColor} />
          <Circle cx={legBR} cy={legBY - 4} r={5} fill={legColor} />
          {/* Seat cushion */}
          <SvgRect x={4} y={1} width={SW - 8} height={16} rx={8} fill={seatColor} />
          {/* Seat bottom shadow (depth) */}
          <SvgRect x={4} y={13} width={SW - 8} height={5} rx={2} fill="rgba(0,0,0,0.22)" />
          {/* Seat highlight sheen */}
          <SvgRect x={10} y={4} width={(SW - 8) * 0.42} height={5}
            rx={2.5} fill={seatSheen} />
        </Svg>
      ))}

      {/* ── Counter lighting: LED channel strip (always visible, off in light mode) */}
      <View style={{
        position: 'absolute', bottom: fH, left: 0, right: 0,
        height: 2,
        backgroundColor: isDark ? 'rgba(255,155,25,0.55)' : 'rgba(90,72,50,0.28)',
        shadowColor: isDark ? '#ffaa00' : 'transparent',
        shadowRadius: 8, shadowOpacity: isDark ? 0.50 : 0,
        shadowOffset: { width: 0, height: 0 },
      }} />
      {/* Under-counter channel strip (always visible, off in light mode) */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3,
        backgroundColor: isDark ? 'rgba(40,100,255,0.25)' : 'rgba(55,52,70,0.22)',
        shadowColor: isDark ? '#3060ff' : 'transparent',
        shadowRadius: 10, shadowOpacity: isDark ? 0.40 : 0,
        shadowOffset: { width: 0, height: 0 },
      }} />

      {/* ── Dark-mode-only glow effects ───────────────────── */}
      {isDark && (
        <>
          {/* Warm glow spreading down the counter face — long gradual fade */}
          <Svg
            width={fW} height={80}
            style={{ position: 'absolute', bottom: fH - 80, left: 0 }}
            pointerEvents="none"
          >
            <Defs>
              <LinearGradient id="ctFaceGlow" x1="0.5" y1="0" x2="0.5" y2="1">
                <Stop offset="0"    stopColor="#ff9820" stopOpacity={0.18} />
                <Stop offset="0.25" stopColor="#ff7800" stopOpacity={0.09} />
                <Stop offset="0.60" stopColor="#ff5000" stopOpacity={0.03} />
                <Stop offset="1"    stopColor="#ff3000" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <SvgRect x={0} y={0} width={fW} height={80} fill="url(#ctFaceGlow)" />
          </Svg>
          {/* Spotlight pools on counter top surface */}
          {stools.map((cx, i) => (
            <Svg key={`spot${i}`}
              width={120} height={COUNTER_TOP_H + 4}
              style={{ position: 'absolute', bottom: fH + COUNTER_TOP_H - 4, left: cx - 60 }}
              pointerEvents="none"
            >
              <Defs>
                <RadialGradient id={`spot${i}`} cx="50%" cy="80%" rx="50%" ry="80%">
                  <Stop offset="0"   stopColor="#fff5c0" stopOpacity={0.25} />
                  <Stop offset="1"   stopColor="#ffcc40" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <SvgRect x={0} y={0} width={120} height={COUNTER_TOP_H + 4} fill={`url(#spot${i})`} />
            </Svg>
          ))}
        </>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// COUNTER DECORATIONS  (bottles + glasses sitting on counter top)
// ─────────────────────────────────────────────────────────────────
// WALL PLAYER  (CD / Cassette / Radio — style and color from store)
// ─────────────────────────────────────────────────────────────────
function WallCDPlayer() {
  const { bgmPlaying, barPlayerStyleId, barPlayerColorId } = useAppStore();
  const isDark    = useIsDark();
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const toggleBgm = useBgmToggle();

  useEffect(() => {
    if (bgmPlaying) {
      const spin = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1800, useNativeDriver: true, easing: Easing.linear })
      );
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1,   duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );
      spin.start(); glow.start();
      return () => { spin.stop(); spinAnim.setValue(0); glow.stop(); glowAnim.setValue(0); };
    } else {
      spinAnim.setValue(0); glowAnim.setValue(0);
    }
  }, [bgmPlaying, spinAnim, glowAnim]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const BSPC = 80;
  const BW = 60, BH = 60;
  const W  = BW + BSPC;
  const H  = BH + 82;
  const CX = BW / 2;
  const CY = BH / 2;

  const pc = BAR_PLAYER_COLORS.find(c => c.id === barPlayerColorId) ?? BAR_PLAYER_COLORS[0];
  const bodyFill   = isDark ? pc.dark : pc.light;
  const bodyStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)';
  const cordClr    = isDark ? '#ffffff' : '#333333';
  const cordMax    = isDark ? 0.45 : 0.30;

  const Cord = () => (
    <Svg width={W} height={H - BH} style={{ position: 'absolute', top: BH }} pointerEvents="none">
      <Defs>
        <LinearGradient id="crdFadeP" gradientUnits="userSpaceOnUse" x1={CX} y1={0} x2={W - 6} y2={H - BH - 6}>
          <Stop offset="0"    stopColor={cordClr} stopOpacity={cordMax} />
          <Stop offset="0.55" stopColor={cordClr} stopOpacity={cordMax * 0.45} />
          <Stop offset="1"    stopColor={cordClr} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={`M ${CX} 0 L ${CX} 13 Q ${CX - 9} 21 ${CX} 29 Q ${CX + 9} 37 ${CX - 2} 45 Q ${CX + 16} 54 ${CX + 42} 60 Q ${CX + 70} 67 122 73 Q 134 77 140 80`}
        stroke="url(#crdFadeP)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );

  // ── CD Player ────────────────────────────────────────────────
  if (barPlayerStyleId === 'cd') {
    const CR = 21, CDR = CR - 1;
    const dotFill = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)';
    return (
      <TouchableOpacity onPress={toggleBgm} activeOpacity={0.8} style={{ width: W, height: H }}>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -7, top: -7, width: BW + 14, height: BH + 14, borderRadius: 17, opacity: glowAnim, borderWidth: 1, borderColor: 'rgba(248,192,64,0.55)', shadowColor: '#f8c040', shadowRadius: 18, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 } }} />
        <Svg width={W} height={BH} style={{ position: 'absolute', top: 0 }} pointerEvents="none">
          <SvgRect x={0} y={0} width={BW} height={BH} rx={10} fill={bodyFill} />
          <SvgRect x={0} y={0} width={BW} height={BH} rx={10} fill="none" stroke={bodyStroke} strokeWidth="1" />
          <Line x1={8} y1={1.5} x2={BW - 8} y2={1.5} stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.80)'} strokeWidth="1" strokeLinecap="round" />
          <Circle cx={CX} cy={CY} r={CR + 2} fill={isDark ? '#1a1a26' : '#e0ddd8'} />
          {[-10, -5, 0, 5, 10].map(dy => (<Circle key={`l${dy}`} cx={7} cy={CY + dy} r={1.1} fill={dotFill} />))}
          {[-10, -5, 0, 5, 10].map(dy => (<Circle key={`r${dy}`} cx={BW - 7} cy={CY + dy} r={1.1} fill={dotFill} />))}
        </Svg>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: CX - CDR, top: CY - CDR, width: CDR * 2, height: CDR * 2, transform: [{ rotate: spin }] }}>
          <Svg width={CDR * 2} height={CDR * 2}>
            <Circle cx={CDR} cy={CDR} r={CDR}      fill="#1a0802" />
            <Circle cx={CDR} cy={CDR} r={CDR - 1}  fill="#7a2010" />
            <Circle cx={CDR} cy={CDR} r={CDR - 3}  fill="#b04018" />
            <Circle cx={CDR} cy={CDR} r={CDR - 5}  fill="#cc6020" />
            <Circle cx={CDR} cy={CDR} r={CDR - 9}  fill="#e49030" />
            <Circle cx={CDR} cy={CDR} r={CDR - 13} fill="#f8c040" />
            <Circle cx={CDR} cy={CDR} r={7}   fill="#f0a820" />
            <Circle cx={CDR} cy={CDR} r={2.5} fill="#111" />
            <Circle cx={CDR - 8}  cy={CDR - 9}  r={3.5} fill="rgba(255,255,255,0.18)" />
            <Circle cx={CDR + 11} cy={CDR - 5}  r={2.2} fill="rgba(255,240,160,0.28)" />
          </Svg>
        </Animated.View>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: CX - CR - 4, top: CY - CR - 4, width: (CR + 4) * 2, height: (CR + 4) * 2, borderRadius: CR + 4, opacity: glowAnim, borderWidth: 1.5, borderColor: 'rgba(248,192,64,0.65)', shadowColor: '#f8c040', shadowRadius: 10, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 } }} />
        <Svg width={W} height={BH} style={{ position: 'absolute', top: 0 }} pointerEvents="none">
          <Circle cx={CX} cy={CY} r={CR} fill="rgba(255,255,255,0.04)" />
          <Circle cx={CX} cy={CY} r={CR} fill="none" stroke={isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'} strokeWidth="1.2" />
          <Path d={`M ${CX - 13} ${CY - 16} Q ${CX} ${CY - 24} ${CX + 13} ${CY - 16}`} fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)'} />
        </Svg>
        <Cord />
      </TouchableOpacity>
    );
  }

  // ── Cassette Player ──────────────────────────────────────────
  if (barPlayerStyleId === 'cassette') {
    const WX = 10, WY = 12, WW = 40, WH = 22; // cassette window rect
    const R1X = WX + 10, R2X = WX + WW - 10, RY = WY + WH / 2;
    const RR = 7;
    return (
      <TouchableOpacity onPress={toggleBgm} activeOpacity={0.8} style={{ width: W, height: H }}>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -7, top: -7, width: BW + 14, height: BH + 14, borderRadius: 14, opacity: glowAnim, borderWidth: 1, borderColor: 'rgba(248,192,64,0.55)', shadowColor: '#f8c040', shadowRadius: 18, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 } }} />
        <Svg width={W} height={BH} style={{ position: 'absolute', top: 0 }} pointerEvents="none">
          {/* Body */}
          <SvgRect x={0} y={0} width={BW} height={BH} rx={8} fill={bodyFill} />
          <SvgRect x={0} y={0} width={BW} height={BH} rx={8} fill="none" stroke={bodyStroke} strokeWidth="1" />
          {/* Cassette window */}
          <SvgRect x={WX} y={WY} width={WW} height={WH} rx={4} fill={isDark ? '#0e0e18' : '#d0ccc8'} />
          <SvgRect x={WX} y={WY} width={WW} height={WH} rx={4} fill="none" stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)'} strokeWidth="0.8" />
          {/* Tape line */}
          <Line x1={R1X + RR} y1={RY} x2={R2X - RR} y2={RY} stroke={isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.15)'} strokeWidth="1.2" />
          {/* Buttons */}
          {[14, 24, 34, 44].map((bx, i) => (
            <SvgRect key={i} x={bx - 4} y={BH - 12} width={8} height={6} rx={2} fill={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)'} />
          ))}
          {/* LED */}
          <Circle cx={BW - 8} cy={8} r={2.5} fill={bgmPlaying ? '#f8c040' : (isDark ? '#333' : '#aaa')} />
        </Svg>
        {/* Spinning reels */}
        {[R1X, R2X].map((rx, i) => (
          <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', left: rx - RR, top: RY - RR, width: RR * 2, height: RR * 2, transform: [{ rotate: spin }] }}>
            <Svg width={RR * 2} height={RR * 2}>
              <Circle cx={RR} cy={RR} r={RR}     fill={isDark ? '#1e1a10' : '#b0a890'} />
              <Circle cx={RR} cy={RR} r={RR - 2} fill={isDark ? '#2a2418' : '#c8c0a8'} />
              <Circle cx={RR} cy={RR} r={3}       fill={isDark ? '#444' : '#888'} />
              <Line x1={RR} y1={1} x2={RR} y2={RR - 3} stroke={isDark ? '#555' : '#777'} strokeWidth="1.2" />
              <Line x1={RR} y1={RR + 3} x2={RR} y2={RR * 2 - 1} stroke={isDark ? '#555' : '#777'} strokeWidth="1.2" />
            </Svg>
          </Animated.View>
        ))}
        <Cord />
      </TouchableOpacity>
    );
  }

  // ── Radio ────────────────────────────────────────────────────
  const antennaH = 18;
  const totalH   = H + antennaH;
  const dialCX = BW - 16, dialCY = BH / 2, dialR = 11;
  return (
    <TouchableOpacity onPress={toggleBgm} activeOpacity={0.8} style={{ width: W, height: totalH }}>
      {/* Antenna */}
      <Svg width={W} height={antennaH + 4} style={{ position: 'absolute', top: 0 }} pointerEvents="none">
        <Line x1={BW - 12} y1={antennaH} x2={BW - 4} y2={2} stroke={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.30)'} strokeWidth="1.4" strokeLinecap="round" />
      </Svg>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -7, top: antennaH - 7, width: BW + 14, height: BH + 14, borderRadius: 14, opacity: glowAnim, borderWidth: 1, borderColor: 'rgba(248,192,64,0.55)', shadowColor: '#f8c040', shadowRadius: 18, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 } }} />
      <Svg width={W} height={BH} style={{ position: 'absolute', top: antennaH }} pointerEvents="none">
        {/* Body */}
        <SvgRect x={0} y={0} width={BW} height={BH} rx={8} fill={bodyFill} />
        <SvgRect x={0} y={0} width={BW} height={BH} rx={8} fill="none" stroke={bodyStroke} strokeWidth="1" />
        {/* Divider */}
        <Line x1={BW - 28} y1={6} x2={BW - 28} y2={BH - 6} stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'} strokeWidth="0.8" />
        {/* Speaker grill — left section */}
        {[0,1,2].flatMap(row => [0,1,2].map(col => (
          <Circle key={`g${row}${col}`} cx={7 + col * 8} cy={14 + row * 10} r={1.8} fill={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.18)'} />
        )))}
        {/* Dial */}
        <Circle cx={dialCX} cy={dialCY} r={dialR} fill={isDark ? '#1a1a26' : '#d8d4cc'} />
        <Circle cx={dialCX} cy={dialCY} r={dialR} fill="none" stroke={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'} strokeWidth="1" />
        <Circle cx={dialCX} cy={dialCY} r={3} fill={isDark ? '#444' : '#888'} />
        <Circle cx={dialCX - 7} cy={dialCY - 7} r={1.8} fill={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.70)'} />
        {/* LED */}
        <Circle cx={BW - 6} cy={BH - 7} r={2.5} fill={bgmPlaying ? '#f8c040' : (isDark ? '#333' : '#aaa')} />
        {/* Small knob */}
        <Circle cx={dialCX} cy={BH - 8} r={4} fill={isDark ? '#2a2a38' : '#c8c4bc'} />
        <Circle cx={dialCX} cy={BH - 8} r={4} fill="none" stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'} strokeWidth="0.8" />
      </Svg>
      <Cord />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────
function CounterDecorations() {
  const H = 116;
  const W = SCREEN_W;
  const BW = 46; const BH = 110;

  const mx1 = Math.round(W * 0.21);
  const mx2 = Math.round(W * 0.74);

  // glass render sizes (much smaller than bottles)
  const GW_M = 22; const GH_M = 32;   // martini
  const GW_T = 24; const GH_T = 30;   // tumbler

  return (
    <View style={{ position: 'absolute', bottom: COUNTER_FACE_H + COUNTER_TOP_H, left: 0, right: 0, height: H }}>

      {/* ── Martini glass (rendered 32×46, coords in 44×62 space) ── */}
      <Svg width={GW_M} height={GH_M} viewBox="0 0 44 62" style={{ position: 'absolute', bottom: 0, left: mx1 - GW_M / 2 }}>
        <Defs>
          <LinearGradient id="mLiq" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#e8d880" stopOpacity={0.45} />
            <Stop offset="1"   stopColor="#c0940a" stopOpacity={0.72} />
          </LinearGradient>
          <LinearGradient id="mHL" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"   stopColor="#ffffff" stopOpacity={0.52} />
            <Stop offset="1"   stopColor="#ffffff" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="mHR" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"   stopColor="#ffffff" stopOpacity={0} />
            <Stop offset="1"   stopColor="#ffffff" stopOpacity={0.28} />
          </LinearGradient>
        </Defs>
        <Path d="M 9,18 L 35,18 L 22,44 Z" fill="url(#mLiq)" />
        <Line x1="9" y1="18" x2="35" y2="18" stroke="rgba(255,255,255,0.45)" strokeWidth="0.9" />
        <Path d="M 2,6 L 42,6 L 22,44 Z"
          fill="rgba(200,230,255,0.06)" stroke="rgba(210,240,255,0.88)" strokeWidth="1.6" strokeLinejoin="round" />
        <Path d="M 2,6 L 12,6 L 22,44 Z" fill="url(#mHL)" />
        <Path d="M 32,6 L 42,6 L 22,44 Z" fill="url(#mHR)" />
        <Line x1="2" y1="6" x2="42" y2="6" stroke="rgba(255,255,255,0.88)" strokeWidth="2" strokeLinecap="round" />
        <Line x1="22" y1="44" x2="22" y2="57" stroke="rgba(220,240,255,0.78)" strokeWidth="1.6" />
        <Line x1="21.2" y1="44" x2="21.2" y2="57" stroke="rgba(255,255,255,0.32)" strokeWidth="0.7" />
        <Line x1="8" y1="57" x2="36" y2="57" stroke="rgba(220,240,255,0.82)" strokeWidth="2.4" strokeLinecap="round" />
        <Line x1="8" y1="56.2" x2="22" y2="56.2" stroke="rgba(255,255,255,0.42)" strokeWidth="1" strokeLinecap="round" />
        <Line x1="19" y1="6" x2="30" y2="16" stroke="rgba(190,165,95,0.92)" strokeWidth="1" />
        <Circle cx={30} cy={17} r={4.5} fill="#3d6e28" />
        <Circle cx={30} cy={17} r={4.5} fill="rgba(0,0,0,0)" stroke="rgba(0,80,0,0.50)" strokeWidth="0.8" />
        <Circle cx={30} cy={17} r={1.8} fill="#cc1520" />
        <Circle cx={28} cy={15} r={1.1} fill="rgba(255,255,255,0.38)" />
      </Svg>

      {/* ── Tumbler / rocks glass (rendered 36×43, coords in 48×58 space) ── */}
      <Svg width={GW_T} height={GH_T} viewBox="0 0 48 58" style={{ position: 'absolute', bottom: 0, left: mx2 - GW_T / 2 }}>
        <Defs>
          <LinearGradient id="tLiq" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#d4800a" stopOpacity={0.55} />
            <Stop offset="1"   stopColor="#7a3800" stopOpacity={0.88} />
          </LinearGradient>
          <LinearGradient id="tGL" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"   stopColor="#ffffff" stopOpacity={0.52} />
            <Stop offset="1"   stopColor="#ffffff" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="tGR" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"   stopColor="#ffffff" stopOpacity={0} />
            <Stop offset="1"   stopColor="#ffffff" stopOpacity={0.28} />
          </LinearGradient>
          <LinearGradient id="tIce" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0"   stopColor="#eaf6ff" stopOpacity={0.92} />
            <Stop offset="1"   stopColor="#a8ccec" stopOpacity={0.70} />
          </LinearGradient>
        </Defs>
        <Path d="M 7,28 L 41,28 L 38,54 L 10,54 Z" fill="url(#tLiq)" />
        <SvgRect x={8} y={16} width={16} height={14} rx={2.5}
          fill="url(#tIce)" stroke="rgba(255,255,255,0.68)" strokeWidth={0.9} />
        <Line x1="8" y1="22" x2="24" y2="19" stroke="rgba(255,255,255,0.28)" strokeWidth="0.7" />
        <Line x1="14" y1="16" x2="14" y2="30" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
        <SvgRect x={25} y={14} width={15} height={15} rx={2.5}
          fill="url(#tIce)" stroke="rgba(255,255,255,0.68)" strokeWidth={0.9} />
        <Line x1="25" y1="21" x2="40" y2="18" stroke="rgba(255,255,255,0.26)" strokeWidth="0.7" />
        <Line x1="32" y1="14" x2="32" y2="29" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
        <Path d="M 5,4 L 43,4 L 38,54 L 10,54 Z"
          fill="rgba(210,235,255,0.05)" stroke="rgba(210,240,255,0.82)" strokeWidth="1.6" strokeLinejoin="round" />
        <Path d="M 5,4 L 12,4 L 10.5,54 L 6,54 Z" fill="url(#tGL)" />
        <Path d="M 36,4 L 43,4 L 42,54 L 38,54 Z" fill="url(#tGR)" />
        <Line x1="5" y1="4" x2="43" y2="4" stroke="rgba(255,255,255,0.92)" strokeWidth="2.6" strokeLinecap="round" />
        <Line x1="7" y1="28" x2="41" y2="28" stroke="rgba(255,255,255,0.32)" strokeWidth="0.9" />
        <Path d="M 10,54 L 38,54 L 37,58 L 11,58 Z"
          fill="rgba(190,220,245,0.28)" stroke="rgba(215,240,255,0.60)" strokeWidth="0.8" />
      </Svg>

      {/* ── Bottle images ──────────────────────────────────── */}
      <ExpoImage
        source={{ uri: 'https://www.thecocktaildb.com/images/ingredients/Gin-Medium.png' }}
        style={{ position: 'absolute', bottom: -22, left: Math.round(W * 0.07), width: BW, height: BH }}
        contentFit="contain"
      />
      <ExpoImage
        source={{ uri: 'https://www.thecocktaildb.com/images/ingredients/Bourbon-Medium.png' }}
        style={{ position: 'absolute', bottom: -22, left: Math.round(W * 0.60), width: BW, height: BH }}
        contentFit="contain"
      />

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// BOTTOM PANEL
// ─────────────────────────────────────────────────────────────────
function BottomPanel({ item, t, onClose }: { item: InventoryItem; t: Texts; onClose: () => void }) {
  const { lang, updateInventoryItem, removeInventoryItem, logCocktailAttempt, awardNotePoints, cocktailAttemptDates } = useAppStore();
  const C        = useColors();
  const today    = new Date().toISOString().slice(0, 10);
  const alreadyLoggedToday = cocktailAttemptDates[item.id] === today;
  const styles   = useStyles();
  const rating   = item.myRating ?? 0;
  const hasInfo  = item.purchaseDate != null || item.purchasePlace != null || item.openedDate != null;

  return (
    <ScrollView style={styles.panelScroll} contentContainerStyle={styles.panelScrollContent}
      showsVerticalScrollIndicator={false} bounces={false}>
      <View style={styles.panelHandle} />
      <View style={styles.panelHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.panelName}>{item.name}</Text>
          {item.brand != null && (
            <Text style={styles.panelBrand}>{item.brand}{item.abv != null ? ` · ${item.abv}% ABV` : ''}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnTxt}>{t.close}</Text>
        </TouchableOpacity>
      </View>

      {/* Cocktail Attempt Log */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceHi, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.border, gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: C.textDim, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 }}>
            {lang === 'ko' ? '칵테일 시도 기록' : 'COCKTAIL LOG'}
          </Text>
          <Text style={{ fontSize: 12, color: C.textDim }}>
            {lang === 'ko'
              ? `총 ${item.cocktailAttempts ?? 0}회 시도 · 기록 시 +10P`
              : `${item.cocktailAttempts ?? 0} attempts · +10pts per log`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => logCocktailAttempt(item.id)}
          disabled={alreadyLoggedToday}
          style={{
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
            backgroundColor: alreadyLoggedToday ? C.surfaceHi : C.primary,
            borderWidth: 1, borderColor: alreadyLoggedToday ? C.border : C.primary,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: alreadyLoggedToday ? C.textDim : C.bg }}>
            {alreadyLoggedToday
              ? (lang === 'ko' ? '오늘 기록완료' : 'Done today')
              : (lang === 'ko' ? '기록하기 +10P' : 'Log +10pts')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Personal Rating (Interactive) */}
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.textDim, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
        {lang === 'ko' ? '개인 평점' : 'MY RATING'}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        {[1,2,3,4,5].map(i => (
          <TouchableOpacity key={i} onPress={() => updateInventoryItem(item.id, { myRating: i === rating ? undefined : i })} style={{ padding: 2 }}>
            <Text style={{ fontSize: 26, color: i <= rating ? C.accent : C.border }}>★</Text>
          </TouchableOpacity>
        ))}
        {rating > 0 && (
          <Text style={{ fontSize: 13, color: C.textDim, marginLeft: 6, fontWeight: '600' }}>{rating}.0 / 5</Text>
        )}
      </View>

      {/* Quantity Selector Chips (Interactive) */}
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.textDim, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
        {lang === 'ko' ? '남은 용량' : 'QUANTITY'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 18 }}>
        {(['full', 'high', 'medium', 'low'] as Qty[]).map(q => {
          const active = item.quantity === q;
          const qLbl = lang === 'ko'
            ? (q === 'full' ? '가득' : q === 'high' ? '많음' : q === 'medium' ? '보통' : '적음')
            : q.toUpperCase();
          return (
            <TouchableOpacity
              key={q}
              onPress={() => updateInventoryItem(item.id, { quantity: q })}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                backgroundColor: active ? C.primary : C.surfaceHi,
                borderWidth: 1, borderColor: active ? C.primary : C.border,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: active ? C.bg : C.textDim }}>{qLbl}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Personal Notes (Interactive Editor) */}
      <View style={{ backgroundColor: C.surfaceHi, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: C.primary, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
          {t.myNotes}
        </Text>
        <TextInput
          style={{ fontSize: 14, color: C.text, lineHeight: 21, fontStyle: 'italic', paddingVertical: 4 }}
          placeholder={lang === 'ko' ? '맛에 대한 감상을 여기에 적어보세요...' : 'Enter tasting notes here...'}
          placeholderTextColor={C.textDim}
          multiline
          value={item.myNote ? item.myNote[lang] : ''}
          onChangeText={(txt) => {
            const existingNote = item.myNote || { en: '', ko: '' };
            updateInventoryItem(item.id, { myNote: { ...existingNote, [lang]: txt } });
            if (txt.length >= 15) awardNotePoints(item.id);
          }}
        />
      </View>

      {/* Record Info */}
      {hasInfo && (
        <View style={{ backgroundColor: C.surfaceHi, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border, gap: 10 }}>
          {item.purchaseDate != null && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: C.textDim, fontWeight: '600' }}>{t.purchased}</Text>
              <Text style={{ fontSize: 12, color: C.text, fontWeight: '500' }}>{item.purchaseDate}</Text>
            </View>
          )}
          {item.purchasePlace != null && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: C.textDim, fontWeight: '600' }}>{t.purchasedAt}</Text>
              <Text style={{ fontSize: 12, color: C.text, fontWeight: '500' }}>{item.purchasePlace}</Text>
            </View>
          )}
          {item.openedDate != null && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: C.textDim, fontWeight: '600' }}>{t.opened}</Text>
              <Text style={{ fontSize: 12, color: C.text, fontWeight: '500' }}>{item.openedDate}</Text>
            </View>
          )}
        </View>
      )}

      {/* Flavor Profile */}
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.textDim, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
        {t.flavorProfile}
      </Text>
      <RadarChart profile={item.profile} labels={t.radarLabels} size={196} />

      {/* Remove from Cabinet Button */}
      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            lang === 'ko' ? '술병 제거' : 'Remove Bottle',
            lang === 'ko' ? `정말 진열장에서 ${item.name}을(를) 치우시겠습니까?` : `Are you sure you want to remove ${item.name} from your bar cabinet?`,
            [
              { text: lang === 'ko' ? '취소' : 'Cancel', style: 'cancel' },
              {
                text: lang === 'ko' ? '치우기' : 'Remove',
                style: 'destructive',
                onPress: () => {
                  removeInventoryItem(item.id);
                  onClose();
                }
              }
            ]
          );
        }}
        style={{
          backgroundColor: 'rgba(235,87,87,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(235,87,87,0.35)',
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: 'center',
          marginTop: 24,
          marginBottom: 10,
        }}
      >
        <Text style={{ color: '#eb5757', fontSize: 13, fontWeight: '700' }}>
          {lang === 'ko' ? '진열장에서 치우기' : 'Remove from Bar'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────
function calcFlavorSim(a: FlavorP, b: FlavorP): number {
  const keys: (keyof FlavorP)[] = ['sweet', 'sour', 'bitter', 'body', 'aroma'];
  
  // 1. Cosine Similarity (70%)
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  keys.forEach(k => {
    dotProduct += a[k] * b[k];
    normA += a[k] * a[k];
    normB += b[k] * b[k];
  });
  const cosineSim = (normA > 0 && normB > 0) ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  
  // 2. Manhattan Similarity (30%)
  const manhattanDist = keys.reduce((sum, k) => sum + Math.abs(a[k] - b[k]), 0);
  const manhattanSim = Math.max(0, 1 - manhattanDist / 25);
  
  const score = Math.round((0.7 * cosineSim + 0.3 * manhattanSim) * 100);
  return Math.min(100, Math.max(0, score));
}

function generateTastingNote(p: FlavorP, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    const sweetWord = p.sweet <= 1 ? '매우 드라이하고' : p.sweet <= 3 ? '은은한 단맛과' : '묵직한 달콤함이 도드라지며,';
    const sourWord = p.sour <= 1 ? '산미가 낮아 부드러운 느낌을 줍니다.' : p.sour <= 3 ? '적당히 싱그러운 산미가 균형을 이루고,' : '짜릿하고 상큼한 시트러스 톤이 강렬하게 피어납니다.';
    const bitterWord = p.bitter <= 1 ? '' : p.bitter <= 3 ? '끝맛에 약한 쌉싸름함이 복합성을 더하고,' : '드라이하고 씁쓸한 풍미가 묵직하게 가라앉혀 줍니다.';
    const bodyWord = p.body <= 2 ? '가볍고 청량하게 즐기기 좋으며,' : '입안 가득 차는 바디감이 고급스럽고,';
    const aromaWord = p.aroma <= 2 ? '깔끔한 피니시를 선사합니다.' : '다채로운 아로마 향이 코끝에 기분 좋게 맴돕니다.';

    return [sweetWord, sourWord, bitterWord, bodyWord, aromaWord].filter(Boolean).join(' ');
  } else {
    const sweetWord = p.sweet <= 1 ? 'Very dry on the palate,' : p.sweet <= 3 ? 'With a subtle sweetness' : 'Marked by a bold and heavy sweetness,';
    const sourWord = p.sour <= 1 ? 'offering a low-acid smooth finish.' : p.sour <= 3 ? 'balanced by a pleasant, refreshing acidity,' : 'with a sharp and vibrant citrus punch.';
    const bitterWord = p.bitter <= 1 ? '' : p.bitter <= 3 ? 'A touch of bitterness adds complexity at the end,' : 'A strong, herbal bitterness anchors the drink deeply.';
    const bodyWord = p.body <= 2 ? 'It carries a light and crisp body,' : 'Boasting a rich, full-bodied texture,';
    const aromaWord = p.aroma <= 2 ? 'leaving a clean finish.' : 'accompanied by a highly aromatic bouquet.';

    return [sweetWord, sourWord, bitterWord, bodyWord, aromaWord].filter(Boolean).join(' ');
  }
}

function genFlavorTags(p: FlavorP, lang: Lang): string[] {
  const tags: string[] = [];
  if (p.sweet  >= 4) tags.push(lang === 'ko' ? '#달콤한'   : '#Sweet');
  if (p.sour   >= 4) tags.push(lang === 'ko' ? '#시트러스'  : '#Citrusy');
  if (p.bitter >= 4) tags.push(lang === 'ko' ? '#비터'     : '#Bold');
  if (p.body   >= 4) tags.push(lang === 'ko' ? '#풀바디'   : '#FullBody');
  if (p.aroma  >= 4) tags.push(lang === 'ko' ? '#아로마틱'  : '#Aromatic');
  if (p.sweet  <= 1 && p.sour <= 1) tags.push(lang === 'ko' ? '#드라이' : '#Dry');
  if (tags.length === 0) tags.push(lang === 'ko' ? '#밸런스드' : '#Balanced');
  return tags;
}

function computeGenomeProfile(items: InventoryItem[], journal: JournalEntry[]): FlavorP | null {
  const weighted: Array<{ p: FlavorP; w: number }> = [
    ...items.filter(it => (it.myRating ?? 0) > 0).map(it => ({ p: it.profile, w: it.myRating! })),
    ...journal.map(j => ({ p: j.profile, w: j.rating })),
  ];
  if (weighted.length === 0) return null;
  const total = weighted.reduce((s, e) => s + e.w, 0);
  if (total === 0) return null;
  return {
    sweet:  Math.round(weighted.reduce((s, e) => s + e.p.sweet  * e.w, 0) / total),
    sour:   Math.round(weighted.reduce((s, e) => s + e.p.sour   * e.w, 0) / total),
    bitter: Math.round(weighted.reduce((s, e) => s + e.p.bitter * e.w, 0) / total),
    body:   Math.round(weighted.reduce((s, e) => s + e.p.body   * e.w, 0) / total),
    aroma:  Math.round(weighted.reduce((s, e) => s + e.p.aroma  * e.w, 0) / total),
  };
}

function genomeInsightText(genome: FlavorP, lang: Lang): string {
  const keys: (keyof FlavorP)[] = ['sweet', 'sour', 'bitter', 'body', 'aroma'];
  const lblEn: Record<keyof FlavorP, string> = { sweet:'Sweet', sour:'Citrus', bitter:'Bold', body:'Full Body', aroma:'Aromatic' };
  const lblKo: Record<keyof FlavorP, string> = { sweet:'달콤한', sour:'시트러스', bitter:'강렬한', body:'풀바디', aroma:'향기로운' };
  const top = keys.reduce((a, b) => genome[a] >= genome[b] ? a : b);
  if (lang === 'ko') return `당신의 입맛은 ${lblKo[top]} 방향입니다.`;
  return `Your palate leans towards ${lblEn[top]}.`;
}

const DIM_LABELS: Record<keyof FlavorP, { en: string; ko: string }> = {
  sweet:  { en: 'Sweet',  ko: '단맛' },
  sour:   { en: 'Sour',   ko: '산미' },
  bitter: { en: 'Bitter', ko: '쓴맛' },
  body:   { en: 'Body',   ko: '바디' },
  aroma:  { en: 'Aroma',  ko: '향'   },
};

// ─────────────────────────────────────────────────────────────────
// ATMOSPHERE CARD
// ─────────────────────────────────────────────────────────────────
function AtmosphereCard({ hour, lang, onBarMode, isActive }: {
  hour: number; lang: Lang; onBarMode: () => void; isActive: boolean;
}) {
  const C      = useColors();
  const isDark = useIsDark();
  const { barWallThemeId } = useAppStore();
  const mood      = getMoodByHour(hour);
  const wallTheme = BAR_WALL_THEMES.find(t => t.id === barWallThemeId) ?? BAR_WALL_THEMES[0];
  const cardBg    = isDark ? wallTheme.darkBg : wallTheme.lightBg;

  return (
    <TouchableOpacity
      onPress={onBarMode}
      activeOpacity={0.85}
      style={{
        marginHorizontal: 22, marginTop: 8, marginBottom: 6,
        backgroundColor: cardBg,
        borderRadius: 16, borderWidth: 1, borderColor: isActive ? `${mood.lightColor}55` : C.border,
        overflow: 'hidden',
      }}
    >
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: mood.lightColor, opacity: 0.9 }} />

      {/* Content */}
      <View style={{ padding: 14, paddingLeft: 18, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: C.textDim, letterSpacing: 1.2, textTransform: 'uppercase', flex: 1 }}>
            {lang === 'ko'
              ? (hour < 6 ? '오늘 밤의 분위기' : hour < 12 ? '오늘 아침의 분위기' : hour < 17 ? '오늘 오후의 분위기' : hour < 20 ? '오늘 저녁의 분위기' : '오늘 밤의 분위기')
              : (hour < 6 ? "TONIGHT'S ATMOSPHERE" : hour < 12 ? "THIS MORNING'S VIBE" : hour < 17 ? "THIS AFTERNOON'S VIBE" : hour < 20 ? "THIS EVENING'S VIBE" : "TONIGHT'S ATMOSPHERE")}
          </Text>
          <Text style={{ fontSize: 18, marginRight: 14 }}>{mood.emoji}</Text>
        </View>

        <Text style={{ fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3, marginBottom: 10 }}>
          {lang === 'ko' ? mood.cocktailKo : mood.cocktailEn}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 11 }}>♫</Text>
            <Text style={{ fontSize: 11, color: C.textDim, fontWeight: '500' }}>
              {lang === 'ko' ? mood.musicGenreKo : mood.musicGenre}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: mood.lightColor }} />
            <Text style={{ fontSize: 11, color: C.textDim, fontWeight: '500' }}>
              {lang === 'ko' ? mood.lightLabelKo : mood.lightLabel}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 11 }}>🎬</Text>
            <Text style={{ fontSize: 11, color: C.textDim, fontWeight: '500' }} numberOfLines={1}>
              {lang === 'ko' ? mood.movieKo : mood.movieEn}
            </Text>
          </View>
        </View>

        {/* Arrow indicator — bottom right */}
        <Text style={{
          position: 'absolute', bottom: 10, right: 14,
          fontSize: 13, fontWeight: '700',
          color: isActive ? mood.lightColor : C.textDim,
        }}>
          {isActive ? '▲' : '▼'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function AddSpiritModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { lang, addInventoryItem } = useAppStore();
  const C = useColors();

  const [searchQuery, setSearchQuery] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedApiName, setSelectedApiName] = useState<string | null>(null);
  const [brand, setBrand] = useState('');
  const [abv, setAbv] = useState('');
  const [quantity, setQuantity] = useState<Qty>('full');
  const [rating, setRating] = useState<number>(0);
  const [noteEn, setNoteEn] = useState('');
  const [noteKo, setNoteKo] = useState('');

  // Flavor Profile Slider States
  const [sweet, setSweet] = useState(2);
  const [sour, setSour] = useState(1);
  const [bitter, setBitter] = useState(2);
  const [body, setBody] = useState(3);
  const [aroma, setAroma] = useState(3);

  // Swipe-to-close
  const panY       = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const swipePan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
    onPanResponderMove: (_, gs) => { if (gs.dy > 0) panY.setValue(gs.dy); },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 100 || gs.vy > 0.8) {
        Animated.timing(panY, { toValue: 800, duration: 220, useNativeDriver: true })
          .start(() => { panY.setValue(0); onCloseRef.current(); });
      } else {
        Animated.spring(panY, { toValue: 0, useNativeDriver: true, friction: 10 }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(panY, { toValue: 0, useNativeDriver: true, friction: 10 }).start();
    },
  })).current;

  // Fetch ingredients from TheCocktailDB API
  useEffect(() => {
    if (!visible) {
      return;
    }
    
    // Reset state when modal opens
    setSearchQuery('');
    setSelectedApiName(null);
    setBrand('');
    setAbv('');
    setQuantity('full');
    setRating(0);
    setNoteEn('');
    setNoteKo('');
    setSweet(2); setSour(1); setBitter(2); setBody(3); setAroma(3);

    const loadIngredients = async () => {
      setLoading(true);
      try {
        const res = await fetch('https://www.thecocktaildb.com/api/json/v1/1/list.php?i=list');
        const json = await res.json();
        if (json && json.drinks) {
          const list = json.drinks.map((d: any) => d.strIngredient1).sort();
          setIngredients(list);
          setFiltered(list);
        }
      } catch (err) {
        // Fallback popular list if API fails
        const fallback = [
          'Bourbon', 'Gin', 'Vodka', 'Campari', 'Amaretto', 'Scotch', 'Tequila', 'Cognac',
          'Rum', 'Dark Rum', 'Light Rum', 'Spiced Rum', 'Triple Sec', 'Kahlua', 'Sweet Vermouth',
          'Dry Vermouth', 'Cointreau', 'Brandy', 'Baileys Irish Cream', 'Absinthe', 'Glayva'
        ].sort();
        setIngredients(fallback);
        setFiltered(fallback);
      } finally {
        setLoading(false);
      }
    };
    loadIngredients();
  }, [visible]);

  // Filter list when query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFiltered(ingredients);
    } else {
      setFiltered(ingredients.filter(i =>
        i.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    }
  }, [searchQuery, ingredients]);

  const scrollViewRef = useRef<import('react-native').ScrollView>(null);

  // Guess spirit category and default flavors based on name
  const selectIngredient = (name: string) => {
    setSelectedApiName(name);
    setSearchQuery(name);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    
    // Auto-guess spirit type
    const lower = name.toLowerCase();
    let defProfile = { sweet: 2, sour: 1, bitter: 2, body: 3, aroma: 3 };

    if (lower.includes('whiskey') || lower.includes('bourbon') || lower.includes('scotch') || lower.includes('rye')) {
      defProfile = { sweet: 3, sour: 0, bitter: 2, body: 4, aroma: 5 };
    } else if (lower.includes('gin')) {
      defProfile = { sweet: 1, sour: 1, bitter: 2, body: 2, aroma: 5 };
    } else if (lower.includes('vodka')) {
      defProfile = { sweet: 1, sour: 0, bitter: 1, body: 2, aroma: 1 };
    } else if (lower.includes('rum')) {
      defProfile = { sweet: 3, sour: 0, bitter: 1, body: 3, aroma: 4 };
    } else if (lower.includes('tequila') || lower.includes('mezcal')) {
      defProfile = { sweet: 2, sour: 2, bitter: 1, body: 3, aroma: 4 };
    } else if (lower.includes('brandy') || lower.includes('cognac')) {
      defProfile = { sweet: 3, sour: 1, bitter: 2, body: 4, aroma: 5 };
    } else if (lower.includes('campari')) {
      defProfile = { sweet: 2, sour: 1, bitter: 5, body: 3, aroma: 4 };
    } else if (lower.includes('amaretto')) {
      defProfile = { sweet: 5, sour: 0, bitter: 2, body: 3, aroma: 5 };
    }

    setSweet(defProfile.sweet);
    setSour(defProfile.sour);
    setBitter(defProfile.bitter);
    setBody(defProfile.body);
    setAroma(defProfile.aroma);
  };

  const handleConfirm = () => {
    if (!selectedApiName) {
      Alert.alert(lang === 'ko' ? '오류' : 'Error', lang === 'ko' ? '주류 아카이브에서 주류를 골라주세요.' : 'Please select a spirit from the archive.');
      return;
    }

    // Auto-guess spirit category again
    const lower = selectedApiName.toLowerCase();
    let type: SpiritT = 'other';
    if (lower.includes('whiskey') || lower.includes('bourbon') || lower.includes('scotch') || lower.includes('rye')) type = 'whiskey';
    else if (lower.includes('gin')) type = 'gin';
    else if (lower.includes('vodka')) type = 'vodka';
    else if (lower.includes('rum')) type = 'rum';
    else if (lower.includes('tequila') || lower.includes('mezcal')) type = 'tequila';
    else if (lower.includes('brandy') || lower.includes('cognac')) type = 'brandy';
    else if (lower.includes('campari')) type = 'campari';
    else if (lower.includes('amaretto')) type = 'amaretto';

    const cleanAbv = parseFloat(abv) || 40;

    const newSpirit: InventoryItem = {
      id: `ss_custom_${Date.now()}`,
      name: selectedApiName,
      apiName: selectedApiName,
      spiritType: type,
      brand: brand.trim() || selectedApiName,
      abv: cleanAbv,
      quantity,
      profile: { sweet, sour, bitter, body, aroma },
      desc: {
        en: `Custom added ${selectedApiName} from online archive.`,
        ko: `온라인 아카이브에서 직접 추가한 ${selectedApiName}입니다.`,
      },
      myRating: rating > 0 ? rating : undefined,
      purchaseDate: new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      openedDate: new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      myNote: (noteEn.trim() || noteKo.trim()) ? {
        en: noteEn.trim() || noteKo.trim(),
        ko: noteKo.trim() || noteEn.trim(),
      } : undefined,
    };

    addInventoryItem(newSpirit);
    onClose();
    Alert.alert(
      lang === 'ko' ? '진열 완료' : 'Added',
      lang === 'ko' ? `${selectedApiName}을(를) 진열장에 들였어요.` : `${selectedApiName} has been added to your cabinet.`,
      [{ text: lang === 'ko' ? '확인' : 'OK' }],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <Animated.View style={{ transform: [{ translateY: panY }], height: '60%' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>

            {/* Drag handle — swipe down to close */}
            <View {...swipePan.panHandlers} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 8 }}>
              <View style={{ height: 4, width: 40, borderRadius: 2, backgroundColor: C.border }} />
            </View>

            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 }}>
              {selectedApiName ? (
                <TouchableOpacity onPress={() => { setSelectedApiName(null); setSearchQuery(''); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}>
                  <Text style={{ color: C.primary, fontSize: 20, fontWeight: '800', lineHeight: 22 }}>‹</Text>
                  <Text style={{ color: C.primary, fontSize: 13, fontWeight: '700' }}>
                    {lang === 'ko' ? '다시 선택' : 'Back'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>
                  {lang === 'ko' ? '새 주류 추가' : 'Add New Spirit'}
                </Text>
              )}
              <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
                <Text style={{ color: C.textDim, fontSize: 13, fontWeight: '700' }}>
                  {lang === 'ko' ? '취소' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView ref={scrollViewRef} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              {/* Search Input */}
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                {lang === 'ko' ? '온라인 아카이브 검색' : 'SEARCH ONLINE ARCHIVE'}
              </Text>
              <TextInput
                style={{ backgroundColor: C.bg, color: C.text, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border, fontSize: 14 }}
                placeholder={lang === 'ko' ? '예: Gin, Rum, Vermouth...' : 'e.g. Gin, Rum, Vermouth...'}
                placeholderTextColor={C.textDim}
                value={searchQuery}
                onChangeText={(txt) => {
                  setSearchQuery(txt);
                  if (selectedApiName && txt !== selectedApiName) setSelectedApiName(null);
                }}
              />

              {/* Text suggestions dropdown */}
              {!selectedApiName && (
                <View style={{ maxHeight: 120, backgroundColor: C.surfaceHi, borderRadius: 10, marginTop: 4, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
                  {loading ? (
                    <ActivityIndicator style={{ padding: 16 }} color={C.primary} />
                  ) : filtered.length === 0 ? (
                    <Text style={{ padding: 14, color: C.textDim, fontSize: 13, textAlign: 'center' }}>
                      {lang === 'ko' ? '검색 결과가 없습니다.' : 'No ingredients found.'}
                    </Text>
                  ) : (
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {filtered.map(item => (
                        <TouchableOpacity key={item} onPress={() => selectIngredient(item)}
                          style={{ paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
                          <Text style={{ color: C.text, fontSize: 14 }}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Image grid selection (vertical, 3-column) */}
              {!selectedApiName && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                    {lang === 'ko' ? '이미지로 선택' : 'SELECT BY IMAGE'}
                  </Text>
                  {loading ? (
                    <ActivityIndicator color={C.primary} />
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {filtered.map(name => (
                        <View key={name} style={{ width: '33.33%', padding: 4 }}>
                          <TouchableOpacity onPress={() => selectIngredient(name)} activeOpacity={0.75}>
                            <View style={{
                              width: '100%', aspectRatio: 0.74,
                              backgroundColor: C.surfaceHi, borderRadius: 12,
                              borderWidth: 1, borderColor: C.border,
                              alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                            }}>
                              <ExpoImage
                                source={{ uri: `https://www.thecocktaildb.com/images/ingredients/${name}-Medium.png` }}
                                style={{ width: '80%', height: '88%' }}
                                contentFit="contain"
                              />
                            </View>
                            <Text style={{ fontSize: 9, color: C.textDim, fontWeight: '600', marginTop: 3, textAlign: 'center' }} numberOfLines={2}>
                              {name}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Selected state — preview & detail form */}
              {selectedApiName && (
                <View style={{ marginTop: 20 }}>
                  {/* Visual bottle preview */}
                  <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', backgroundColor: C.surfaceHi, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 18 }}>
                    <View style={{ width: 64, height: 84, backgroundColor: C.bg, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                      <ExpoImage
                        source={{ uri: `https://www.thecocktaildb.com/images/ingredients/${selectedApiName}-Medium.png` }}
                        style={{ width: 50, height: 74 }}
                        contentFit="contain"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary, letterSpacing: 0.8 }}>ONLINE DB SELECT</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginTop: 2 }}>{selectedApiName}</Text>
                      <Text style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
                        {lang === 'ko' ? '선반에 진열될 고유 그래픽 이미지입니다.' : 'This image will be displayed on your shelf.'}
                      </Text>
                    </View>
                  </View>

                  {/* Brand & ABV inputs */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    <View style={{ flex: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                        {lang === 'ko' ? '브랜드명' : 'BRAND NAME'}
                      </Text>
                      <TextInput
                        style={{ backgroundColor: C.bg, color: C.text, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border, fontSize: 14 }}
                        placeholder={lang === 'ko' ? '예: Hendrick\'s' : 'e.g. Hendrick\'s'}
                        placeholderTextColor={C.textDim}
                        value={brand}
                        onChangeText={setBrand}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                        {lang === 'ko' ? '도수 (ABV %)' : 'ABV (%)'}
                      </Text>
                      <TextInput
                        style={{ backgroundColor: C.bg, color: C.text, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border, fontSize: 14 }}
                        placeholder="40"
                        keyboardType="numeric"
                        placeholderTextColor={C.textDim}
                        value={abv}
                        onChangeText={setAbv}
                      />
                    </View>
                  </View>

                  {/* Quantity Chips */}
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    {lang === 'ko' ? '남은 용량' : 'QUANTITY'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
                    {(['full', 'high', 'medium', 'low'] as Qty[]).map(q => {
                      const active = quantity === q;
                      const qLbl = lang === 'ko'
                        ? (q === 'full' ? '가득' : q === 'high' ? '많음' : q === 'medium' ? '보통' : '적음')
                        : q.toUpperCase();
                      return (
                        <TouchableOpacity key={q} onPress={() => setQuantity(q)}
                          style={{ flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', backgroundColor: active ? C.primary : C.surfaceHi, borderWidth: 1, borderColor: active ? C.primary : C.border }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: active ? C.bg : C.textDim }}>{qLbl}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Star rating selector */}
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                    {lang === 'ko' ? '개인 평점' : 'MY RATING'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 18 }}>
                    {[1,2,3,4,5].map(star => (
                      <TouchableOpacity key={star} onPress={() => setRating(star === rating ? 0 : star)} style={{ padding: 4 }}>
                        <Text style={{ fontSize: 26, color: star <= rating ? C.accent : C.border }}>★</Text>
                      </TouchableOpacity>
                    ))}
                    {rating > 0 && <Text style={{ fontSize: 13, color: C.textDim, alignSelf: 'center', marginLeft: 8, fontWeight: '700' }}>{rating}.0</Text>}
                  </View>

                  {/* Personal Tasting Notes */}
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                    {lang === 'ko' ? '시음 노트 (한글)' : 'TASTING NOTES (KOREAN)'}
                  </Text>
                  <TextInput
                    style={{ backgroundColor: C.bg, color: C.text, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border, fontSize: 13, minHeight: 60, marginBottom: 12 }}
                    placeholder={lang === 'ko' ? '맛에 대한 느낌을 한글로 적어보세요' : 'Tasting notes in Korean'}
                    placeholderTextColor={C.textDim}
                    multiline
                    value={noteKo}
                    onChangeText={setNoteKo}
                  />

                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                    {lang === 'ko' ? '시음 노트 (영문 - 선택)' : 'TASTING NOTES (ENGLISH - OPTIONAL)'}
                  </Text>
                  <TextInput
                    style={{ backgroundColor: C.bg, color: C.text, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border, fontSize: 13, minHeight: 60, marginBottom: 20 }}
                    placeholder="Notes in English"
                    placeholderTextColor={C.textDim}
                    multiline
                    value={noteEn}
                    onChangeText={setNoteEn}
                  />

                  {/* Custom Taste sliders */}
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                    {lang === 'ko' ? '상세 맛 프로필 조정' : 'FLAVOR PROFILE ADJUSTMENT'}
                  </Text>
                  {([
                    { key: 'sweet', label: '단맛 / Sweet', val: sweet, setVal: setSweet },
                    { key: 'sour', label: '신맛 / Sour', val: sour, setVal: setSour },
                    { key: 'bitter', label: '쓴맛 / Bitter', val: bitter, setVal: setBitter },
                    { key: 'body', label: '바디감 / Body', val: body, setVal: setBody },
                    { key: 'aroma', label: '향 / Aroma', val: aroma, setVal: setAroma },
                  ] as const).map(slider => (
                    <View key={slider.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Text style={{ width: 84, fontSize: 11, fontWeight: '600', color: C.textDim }}>{slider.label}</Text>
                      <TouchableOpacity onPress={() => slider.setVal(prev => Math.max(0, prev - 1))} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 13, color: C.textDim }}>−</Text>
                      </TouchableOpacity>
                      <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                        {[1,2,3,4,5].map(lv => (
                          <View key={lv} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: lv <= slider.val ? C.primary : C.surfaceHi }} />
                        ))}
                      </View>
                      <TouchableOpacity onPress={() => slider.setVal(prev => Math.min(5, prev + 1))} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 13, color: C.primary }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Add Button */}
                  <TouchableOpacity
                    onPress={handleConfirm}
                    style={{
                      backgroundColor: C.text, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 28,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
                    }}
                  >
                    <Text style={{ color: C.bg, fontSize: 15, fontWeight: '800' }}>
                      {lang === 'ko' ? '진열장에 술 들이기' : 'Add Bottle to Cabinet'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────
// BAR CUSTOMIZE PANEL
// ─────────────────────────────────────────────────────────────────
function BarCustomizePanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const {
    lang, barName, setBarName, barNeonColor, setBarNeonColor,
    barWallThemeId, setBarWallThemeId, barLightColor, setBarLightColor,
    barShelfThemeId, setBarShelfThemeId, barCounterThemeId, setBarCounterThemeId,
    barPlayerStyleId, setBarPlayerStyleId, barPlayerColorId, setBarPlayerColorId,
    userPoints, unlockedPremiumIds, unlockPremium,
  } = useAppStore();
  const C      = useColors();
  const isDark = useIsDark();

  const [nameInput, setNameInput] = useState(barName);
  useEffect(() => { if (visible) setNameInput(barName); }, [visible, barName]);

  const handleApplyName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) setBarName(trimmed.slice(0, 16));
  };

  const sectionLbl = (txt: string) => (
    <Text style={{ fontSize: 13, fontWeight: '800', color: C.textDim, letterSpacing: 0.8, marginBottom: 12, textTransform: 'uppercase' }}>{txt}</Text>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ height: '60%', backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: C.text }}>
              {lang === 'ko' ? '바 꾸미기' : 'Customize My Bar'}
            </Text>
            <TouchableOpacity onPress={onClose}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.surfaceHi, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, color: C.textDim, lineHeight: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

        <ScrollView contentContainerStyle={{ padding: 22, gap: 28 }} showsVerticalScrollIndicator={false}>

          {/* ── Points Balance ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,215,0,0.08)' : 'rgba(255,180,0,0.10)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: isDark ? 'rgba(255,215,0,0.22)' : 'rgba(255,180,0,0.30)', gap: 10 }}>
            <Text style={{ fontSize: 20 }}>🪙</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: C.textDim, fontWeight: '600' }}>
                {lang === 'ko' ? '보유 포인트' : 'My Points'}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: isDark ? '#ffd700' : '#b07800' }}>
                {userPoints} P
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: C.textDim, textAlign: 'right', lineHeight: 16 }}>
              {lang === 'ko' ? '칵테일 기록 +10P\n테이스팅 노트 +5P' : 'Cocktail log +10P\nTasting note +5P'}
            </Text>
          </View>

          {/* ── Bar Name ── */}
          <View>
            {sectionLbl(lang === 'ko' ? '🏷  바 이름' : '🏷  Bar Name')}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="OntheRock"
                placeholderTextColor={C.textDim}
                maxLength={16}
                returnKeyType="done"
                onSubmitEditing={handleApplyName}
                style={{
                  flex: 1, backgroundColor: C.surfaceHi,
                  borderRadius: 12, borderWidth: 1, borderColor: C.border,
                  paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 16, color: C.text,
                }}
              />
              <TouchableOpacity onPress={handleApplyName}
                style={{ backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: isDark ? C.bg : '#fff', fontWeight: '800', fontSize: 13 }}>
                  {lang === 'ko' ? '적용' : 'Apply'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>
              * {lang === 'ko' ? '네온 사인에 표시됩니다 (최대 16자)' : 'Displayed on the neon sign (max 16 chars)'}
            </Text>
          </View>

          {/* ── Neon Sign Color ── */}
          <View>
            {sectionLbl(lang === 'ko' ? '✦  네온 사인 색상' : '✦  Neon Sign Color')}
            <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
              {BAR_NEON_COLORS.map(nc => {
                const active   = barNeonColor === nc.color;
                const isPrem   = nc.cost > 0;
                const unlocked = !isPrem || unlockedPremiumIds.includes(nc.id);
                return (
                  <TouchableOpacity key={nc.id}
                    onPress={() => {
                      if (unlocked) { setBarNeonColor(nc.color); return; }
                      unlockPremium(nc.id, nc.cost);
                    }}
                    style={{ alignItems: 'center', gap: 6 }}>
                    <View style={{
                      width: 46, height: 46, borderRadius: 23,
                      backgroundColor: unlocked ? nc.color : `${nc.color}55`,
                      borderWidth: active ? 3 : 1.5,
                      borderColor: active ? C.text : `${nc.color}60`,
                      shadowColor: nc.color,
                      shadowRadius: active ? 10 : 0,
                      shadowOpacity: active ? 0.8 : 0,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: active ? 6 : 1,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {!unlocked && <Text style={{ fontSize: 14 }}>🔒</Text>}
                    </View>
                    <Text style={{ fontSize: 10, color: active ? C.text : C.textDim, fontWeight: active ? '700' : '400' }}>
                      {lang === 'ko' ? nc.label : nc.labelEn}
                    </Text>
                    {isPrem && !unlocked && (
                      <Text style={{ fontSize: 9, color: isDark ? '#ffd700' : '#b07800', fontWeight: '700', marginTop: -4 }}>{nc.cost}P</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Wall Theme ── */}
          <View>
            {sectionLbl(lang === 'ko' ? '🧱  벽 테마' : '🧱  Wall Theme')}
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              {BAR_WALL_THEMES.map(wt => {
                const bg       = isDark ? wt.darkBg : wt.lightBg;
                const active   = barWallThemeId === wt.id;
                const isPrem   = wt.cost > 0;
                const unlocked = !isPrem || unlockedPremiumIds.includes(wt.id);
                return (
                  <TouchableOpacity key={wt.id}
                    onPress={() => {
                      if (unlocked) { setBarWallThemeId(wt.id); return; }
                      unlockPremium(wt.id, wt.cost);
                    }}
                    style={{ alignItems: 'center', gap: 7 }}>
                    <View style={{
                      width: 68, height: 52, borderRadius: 12,
                      backgroundColor: bg,
                      borderWidth: active ? 2.5 : 1,
                      borderColor: active ? C.primary : C.border,
                      opacity: unlocked ? 1 : 0.55,
                      shadowColor: '#000',
                      shadowRadius: active ? 6 : 0,
                      shadowOpacity: active ? 0.3 : 0,
                      shadowOffset: { width: 0, height: 2 },
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {!unlocked && <Text style={{ fontSize: 16 }}>🔒</Text>}
                    </View>
                    <Text style={{ fontSize: 10, color: active ? C.primary : C.textDim, fontWeight: active ? '800' : '400' }}>
                      {lang === 'ko' ? wt.label : wt.labelEn}
                    </Text>
                    {isPrem && !unlocked && (
                      <Text style={{ fontSize: 9, color: isDark ? '#ffd700' : '#b07800', fontWeight: '700', marginTop: -5 }}>{wt.cost}P</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Light Color (dark mode only) ── */}
          {isDark && (
            <View>
              {sectionLbl(lang === 'ko' ? '💡  조명 색상' : '💡  Light Color')}
              <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                {BAR_LIGHT_COLORS.map(lc => {
                  const active = barLightColor === lc.color;
                  return (
                    <TouchableOpacity key={lc.id} onPress={() => setBarLightColor(lc.color)}
                      style={{ alignItems: 'center', gap: 6 }}>
                      <View style={{
                        width: 46, height: 46, borderRadius: 23,
                        backgroundColor: lc.color,
                        borderWidth: active ? 3 : 1.5,
                        borderColor: active ? C.text : `${lc.color}50`,
                        shadowColor: lc.color,
                        shadowRadius: active ? 10 : 0,
                        shadowOpacity: active ? 0.7 : 0,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: active ? 6 : 1,
                      }} />
                      <Text style={{ fontSize: 11, color: active ? C.text : C.textDim, fontWeight: active ? '700' : '400' }}>
                        {lang === 'ko' ? lc.label : lc.labelEn}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Shelf Color ── */}
          <View>
            {sectionLbl(lang === 'ko' ? '🪵  선반 색상' : '🪵  Shelf Color')}
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              {BAR_SHELF_THEMES.map(st => {
                const bg     = isDark ? st.dark : st.light;
                const edge   = isDark ? st.darkEdge : st.lightEdge;
                const active = barShelfThemeId === st.id;
                return (
                  <TouchableOpacity key={st.id} onPress={() => setBarShelfThemeId(st.id)}
                    style={{ alignItems: 'center', gap: 7 }}>
                    <View style={{
                      width: 68, height: 22, borderRadius: 6,
                      backgroundColor: bg,
                      borderTopWidth: 3, borderTopColor: edge,
                      borderWidth: active ? 2.5 : 1,
                      borderColor: active ? C.primary : C.border,
                      shadowColor: '#000',
                      shadowRadius: active ? 6 : 0,
                      shadowOpacity: active ? 0.3 : 0,
                      shadowOffset: { width: 0, height: 2 },
                    }} />
                    <Text style={{ fontSize: 11, color: active ? C.primary : C.textDim, fontWeight: active ? '800' : '400' }}>
                      {lang === 'ko' ? st.label : st.labelEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Counter Material ── */}
          <View>
            {sectionLbl(lang === 'ko' ? '🍸  카운터 재질' : '🍸  Counter Style')}
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              {BAR_COUNTER_THEMES.map(ct => {
                const bg     = isDark ? ct.dark : ct.light;
                const top    = isDark ? ct.darkTop : ct.lightTop;
                const active = barCounterThemeId === ct.id;
                return (
                  <TouchableOpacity key={ct.id} onPress={() => setBarCounterThemeId(ct.id)}
                    style={{ alignItems: 'center', gap: 7 }}>
                    <View style={{
                      width: 68, height: 36, borderRadius: 10,
                      overflow: 'hidden',
                      borderWidth: active ? 2.5 : 1,
                      borderColor: active ? C.primary : C.border,
                      shadowColor: '#000',
                      shadowRadius: active ? 6 : 0,
                      shadowOpacity: active ? 0.3 : 0,
                      shadowOffset: { width: 0, height: 2 },
                    }}>
                      <View style={{ height: 10, backgroundColor: top }} />
                      <View style={{ flex: 1, backgroundColor: bg }} />
                    </View>
                    <Text style={{ fontSize: 11, color: active ? C.primary : C.textDim, fontWeight: active ? '800' : '400' }}>
                      {lang === 'ko' ? ct.label : ct.labelEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Player Style ── */}
          <View>
            {sectionLbl(lang === 'ko' ? '💿  플레이어 종류' : '💿  Player Type')}
            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
              {BAR_PLAYER_STYLES.map(ps => {
                const active = barPlayerStyleId === ps.id;
                return (
                  <TouchableOpacity key={ps.id} onPress={() => setBarPlayerStyleId(ps.id)}
                    style={{ alignItems: 'center', gap: 7 }}>
                    <View style={{
                      width: 68, height: 48, borderRadius: 12,
                      backgroundColor: active ? `${C.primary}18` : C.surfaceHi,
                      borderWidth: active ? 2.5 : 1,
                      borderColor: active ? C.primary : C.border,
                      alignItems: 'center', justifyContent: 'center',
                      shadowColor: '#000',
                      shadowRadius: active ? 6 : 0,
                      shadowOpacity: active ? 0.25 : 0,
                      shadowOffset: { width: 0, height: 2 },
                    }}>
                      <Text style={{ fontSize: 20 }}>
                        {ps.id === 'cd' ? '💿' : ps.id === 'cassette' ? '📼' : '📻'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: active ? C.primary : C.textDim, fontWeight: active ? '800' : '400' }}>
                      {lang === 'ko' ? ps.label : ps.labelEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Player Color ── */}
          <View>
            {sectionLbl(lang === 'ko' ? '🎨  플레이어 색상' : '🎨  Player Color')}
            <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
              {BAR_PLAYER_COLORS.map(pc => {
                const bg     = isDark ? pc.dark : pc.light;
                const active = barPlayerColorId === pc.id;
                return (
                  <TouchableOpacity key={pc.id} onPress={() => setBarPlayerColorId(pc.id)}
                    style={{ alignItems: 'center', gap: 6 }}>
                    <View style={{
                      width: 46, height: 46, borderRadius: 10,
                      backgroundColor: bg,
                      borderWidth: active ? 3 : 1.5,
                      borderColor: active ? C.text : C.border,
                      shadowColor: '#000',
                      shadowRadius: active ? 6 : 0,
                      shadowOpacity: active ? 0.3 : 0,
                      shadowOffset: { width: 0, height: 0 },
                    }} />
                    <Text style={{ fontSize: 11, color: active ? C.text : C.textDim, fontWeight: active ? '700' : '400' }}>
                      {lang === 'ko' ? pc.label : pc.labelEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function HomeScreen() {
  const {
    lang, theme, toggleTheme, setHomeCabH, setHomeCabTop,
    barModeVisible, setBarModeVisible, bgmPlaying, bgmMoodIdx,
    inventoryItems, shelf0Ids, shelf1Ids,
    barNeonColor, barWallThemeId,
  } = useAppStore();
  const styles = useStyles();
  const t      = TEXTS[lang];

  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [cabH,        setCabH]        = useState(0);
  const [draggingId,  setDraggingId]  = useState<string | null>(null);
  const [headerH,     setHeaderH]     = useState(0);
  const [atmosphereH, setAtmosphereH] = useState(0);
  const [addModalVisible,     setAddModalVisible]     = useState(false);
  const [customizeVisible,    setCustomizeVisible]    = useState(false);

  const focusedItem = useMemo(
    () => inventoryItems.find(it => it.id === focusedItemId) ?? null,
    [focusedItemId, inventoryItems],
  );

  const cabAreaRef  = useRef<View>(null);
  const panelAnim   = useRef(new Animated.Value(PANEL_H)).current;
  const shelfPlanks = useMemo(() => SHELF_FRACS.map(f => Math.round(cabH * f)), [cabH]);
  const hour        = new Date().getHours();
  const mood        = getMoodByHour(hour);
  const track       = BGM_TRACKS[bgmMoodIdx];
  const C           = useColors();
  const isDark      = useIsDark();
  const wallTheme   = BAR_WALL_THEMES.find(t => t.id === barWallThemeId) ?? BAR_WALL_THEMES[0];
  const wallBg      = isDark ? wallTheme.darkBg : wallTheme.lightBg;

  const shelf0 = useMemo(
    () => shelf0Ids.map(id => inventoryItems.find(it => it.id === id)).filter((it): it is InventoryItem => it != null),
    [shelf0Ids, inventoryItems],
  );
  const shelf1 = useMemo(
    () => shelf1Ids.map(id => inventoryItems.find(it => it.id === id)).filter((it): it is InventoryItem => it != null),
    [shelf1Ids, inventoryItems],
  );
  const onCabLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      setCabH(h);
      setHomeCabH(h);
      cabAreaRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
        setHomeCabTop(pageY);
      });
    }
  }, [setHomeCabH, setHomeCabTop]);

  const openPanel = useCallback((item: InventoryItem) => {
    setFocusedItemId(item.id);
    Animated.spring(panelAnim, { toValue: 0, useNativeDriver: true, friction: 12, tension: 90 }).start();
  }, [panelAnim]);

  const closePanel = useCallback(() => {
    Animated.spring(panelAnim, { toValue: PANEL_H, useNativeDriver: true, friction: 10, tension: 80 })
      .start(() => setFocusedItemId(null));
  }, [panelAnim]);

  const onDragStart = useCallback((id: string) => setDraggingId(id), []);

  const onDragEnd = useCallback((id: string, slotDelta: number) => {
    setDraggingId(null);
    if (slotDelta === 0) return;
    const reorder = (ids: string[]) => {
      const idx = ids.indexOf(id);
      if (idx === -1) return ids;
      const nIdx = Math.max(0, Math.min(ids.length - 1, idx + slotDelta));
      if (nIdx === idx) return ids;
      const next = [...ids];
      next.splice(idx, 1);
      next.splice(nIdx, 0, id);
      return next;
    };
    const { shelf0Ids: s0, shelf1Ids: s1, setShelf0Ids: setS0, setShelf1Ids: setS1 } = useAppStore.getState();
    if (s0.includes(id)) {
      setS0(reorder(s0));
    } else if (s1.includes(id)) {
      setS1(reorder(s1));
    }
  }, []);

  return (
    <View style={styles.home}>
      <SafeAreaView edges={['top']} style={styles.homeHeaderSafe} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.homeGreeting}>{t.greeting(hour)}</Text>
            <Text style={styles.homeAtmo}>{t.atmosphere(hour)}</Text>
          </View>
          <View style={styles.headerBtns}>
            <BGMButton />
            <TouchableOpacity
              style={[styles.themeBtn, isDark && { borderColor: `${NEON_PINK_PURPLE}90` }]}
              onPress={toggleTheme}
            >
              <Text style={styles.themeBtnTxt}>{theme === 'dark' ? '☼' : '☾'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.homeCount}>{t.barCount(inventoryItems.length)}</Text>
      </SafeAreaView>

      {/* AtmosphereCard — 상단 바 밖, 항상 표시 */}
      <View onLayout={(e) => setAtmosphereH(e.nativeEvent.layout.height)}>
        <Text style={styles.homeTap}>{t.tapHint}</Text>
        <AtmosphereCard hour={hour} lang={lang} isActive={barModeVisible} onBarMode={() => setBarModeVisible(!barModeVisible)} />
      </View>

      {/* Dropdown panel — absolutely positioned over cabinet, does not affect layout */}
      {barModeVisible && focusedItem == null && (headerH + atmosphereH) > 0 && (
        <View style={{
          position: 'absolute', top: headerH + atmosphereH, left: 22, right: 22, zIndex: 20,
          backgroundColor: wallBg,
          borderWidth: 1, borderTopWidth: 0,
          borderColor: `${mood.lightColor}55`,
          borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
          paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
        }}>
          {/* Large bottle image with glow */}
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 120, height: 160, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: `${mood.lightColor}18` }} />
              <ExpoImage source={{ uri: mood.cocktailImg }} style={{ width: 110, height: 150 }} contentFit="contain" />
            </View>
            <NeonText text="On The Rock" color={mood.lightColor} size={18} script />
            <Text style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>
              {lang === 'ko' ? mood.timeLabelKo : mood.timeLabel}
            </Text>
          </View>
          <View style={{ height: 1, backgroundColor: `${mood.lightColor}22`, marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:10, paddingVertical:5, borderRadius:14, backgroundColor:`${mood.lightColor}10`, borderWidth:1, borderColor:`${mood.lightColor}28` }}>
              <Text style={{ fontSize:12, color: bgmPlaying ? mood.lightColor : C.textDim }}>♫</Text>
              <Text style={{ fontSize:11, color:C.textDim, fontWeight:'500' }}>
                {bgmPlaying ? track.label : (lang === 'ko' ? mood.musicGenreKo : mood.musicGenre)}
              </Text>
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:10, paddingVertical:5, borderRadius:14, backgroundColor:`${mood.lightColor}10`, borderWidth:1, borderColor:`${mood.lightColor}28` }}>
              <View style={{ width:7, height:7, borderRadius:4, backgroundColor:mood.lightColor }} />
              <Text style={{ fontSize:11, color:C.textDim, fontWeight:'500' }}>
                {lang === 'ko' ? mood.lightLabelKo : mood.lightLabel}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Text style={{ fontSize:12, color:C.textDim }}>🎬</Text>
            <Text style={{ fontSize:12, color:C.textDim, fontWeight:'500' }}>
              {lang === 'ko' ? mood.movieKo : mood.movieEn}
            </Text>
          </View>
        </View>
      )}

      <View ref={cabAreaRef} style={styles.cabinetArea} onLayout={onCabLayout}>
        <BarWall />

        {/* ✦ 꾸미기 버튼 — sign area 우측에 floating, BarWall 위에서 터치 수신 */}
        {cabH > 0 && (
          <TouchableOpacity
            onPress={() => setCustomizeVisible(true)}
            style={{
              position: 'absolute',
              top: Math.round(cabH * 0.10 - 15),
              right: 16,
              zIndex: 10,
              width: 30, height: 30, borderRadius: 15,
              backgroundColor: `${isDark ? barNeonColor : C.accent}18`,
              borderWidth: 1,
              borderColor: `${isDark ? barNeonColor : C.accent}55`,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 12, color: isDark ? barNeonColor : C.accent }}>✦</Text>
          </TouchableOpacity>
        )}

        {cabH > 0 && (
          <>
            {/* Clip boundary — hides off-screen bottle pages during shelf slide */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
              <ShelfPendantLights cabH={cabH} />
              <ShelfRow
                plankY={shelfPlanks[0]}
                items={shelf0}
                focusedId={focusedItem?.id ?? null}
                onTapBottle={openPanel}
                draggingId={draggingId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <ShelfRow
                plankY={shelfPlanks[1]}
                items={shelf1}
                focusedId={focusedItem?.id ?? null}
                onTapBottle={openPanel}
                draggingId={draggingId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            </View>

            {/* Fixed wall decorations (outside clip so they're never clipped) */}
            <View style={{ position: 'absolute', right: -62, top: Math.round(shelfPlanks[0] + (shelfPlanks[1] - shelfPlanks[0]) / 2) - 90 }}>
              <WallCDPlayer />
            </View>

            <CounterDecorations />
            <BarCounterDecor />
          </>
        )}
      </View>

      {focusedItem != null && (
        <TouchableOpacity style={[StyleSheet.absoluteFill, styles.overlay]} onPress={closePanel} activeOpacity={1} />
      )}
      <Animated.View style={[styles.panel, { transform: [{ translateY: panelAnim }] }]}>
        {focusedItem != null && <BottomPanel item={focusedItem} t={t} onClose={closePanel} />}
      </Animated.View>
      {/* Floating Action Button for Adding Spirit */}
      {focusedItem == null && (
        <TouchableOpacity
          onPress={() => setAddModalVisible(true)}
          style={{
            position: 'absolute',
            bottom: 96,
            right: 22,
            zIndex: 10,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)',
            borderRadius: 22,
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.35 : 0.08,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <Text style={{ fontSize: 18, color: C.text, fontWeight: '700', lineHeight: 18 }}>+</Text>
          <Text style={{ fontSize: 13, color: C.text, fontWeight: '700', letterSpacing: 0.3 }}>
            {lang === 'ko' ? '술 들이기' : 'Add Spirit'}
          </Text>
        </TouchableOpacity>
      )}

      <AddSpiritModal visible={addModalVisible} onClose={() => setAddModalVisible(false)} />
      <BarCustomizePanel visible={customizeVisible} onClose={() => setCustomizeVisible(false)} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// MIX SCREEN
// ─────────────────────────────────────────────────────────────────
// ─── Mixing simulation ────────────────────────────────────────────
// ── Simulator types / constants ─────────────────────────────────
type SimStage  = 'select' | 'prep' | 'pour' | 'mix' | 'serve';
type GlassType = 'rocks' | 'highball' | 'martini' | 'shot';

interface GlassSpec { GT: number; GB: number; WT: number; WB: number; label: string; labelKo: string }
const SIM_STAGES: SimStage[] = ['select', 'prep', 'pour', 'mix', 'serve'];
const GLASS_SPECS: Record<GlassType, GlassSpec> = {
  rocks:    { GT: 282, GB: 415, WT: 68, WB: 52, label: 'Rocks',    labelKo: '락스'   },
  highball: { GT: 210, GB: 415, WT: 50, WB: 43, label: 'Highball', labelKo: '하이볼' },
  martini:  { GT: 272, GB: 395, WT: 60, WB:  3, label: 'Martini',  labelKo: '마티니' },
  shot:     { GT: 352, GB: 415, WT: 44, WB: 38, label: 'Shot',     labelKo: '샷'    },
};
const GLASS_THUMB: Record<GlassType, { tGT: number; tGB: number; tWT: number; tWB: number }> = {
  rocks:    { tGT: 26, tGB: 64, tWT: 22, tWB: 17 },
  highball: { tGT:  8, tGB: 64, tWT: 16, tWB: 13 },
  martini:  { tGT: 14, tGB: 56, tWT: 20, tWB:  2 },
  shot:     { tGT: 46, tGB: 64, tWT: 15, tWB: 13 },
};
type IceType = 'none' | 'cubed' | 'large' | 'sphere' | 'crushed';

const ICE_TYPES: { id: IceType; label: string; labelEn: string; desc: string; descEn: string }[] = [
  { id: 'none',    label: '없음',     labelEn: 'No Ice',     desc: '니트 / 스트레이트', descEn: 'Neat / Straight' },
  { id: 'cubed',   label: '큐브',     labelEn: 'Cubed',      desc: '일반 각얼음',        descEn: 'Standard cubes' },
  { id: 'large',   label: '큰 얼음',  labelEn: 'Large Rock', desc: '하나의 큰 블록',     descEn: 'One large block' },
  { id: 'sphere',  label: '아이스볼', labelEn: 'Ice Ball',   desc: '구형 얼음',          descEn: 'Round sphere' },
  { id: 'crushed', label: '크러쉬드', labelEn: 'Crushed',    desc: '잘게 부순 얼음',     descEn: 'Finely crushed' },
];

function iceEffCount(iceType: IceType, cubeCount: number): number {
  if (iceType === 'none')    return 0;
  if (iceType === 'sphere')  return 2;
  if (iceType === 'large')   return 3;
  if (iceType === 'crushed') return 5;
  return cubeCount;
}

function BottleSvg({ ingredient, isSelected }: { ingredient: MixIngredient; isSelected: boolean }) {
  const { id, color } = ingredient;
  const cx = 16;

  if (id === '1') { // Bourbon Whiskey — wide-shouldered bottle
    return (
      <Svg width={32} height={54} viewBox="0 0 32 54">
        {/* Corrugated metal cap */}
        <SvgRect x={11} y={1} width={10} height={4} rx={1} fill="#2e1606" />
        <Line x1={14} y1={1} x2={14} y2={5} stroke="rgba(255,255,255,0.10)" strokeWidth={0.7} />
        <Line x1={18} y1={1} x2={18} y2={5} stroke="rgba(255,255,255,0.10)" strokeWidth={0.7} />
        {/* Neck */}
        <SvgRect x={12} y={5} width={8} height={7} fill={color} />
        {/* Wide sloping shoulders + body */}
        <Path d="M 12 12 L 4 17 L 4 50 Q 4 52 6 52 L 26 52 Q 28 52 28 50 L 28 17 L 20 12 Z"
          fill={color} stroke="rgba(255,255,255,0.12)" strokeWidth={0.7} />
        {/* Paper label */}
        <SvgRect x={6} y={21} width={20} height={22} rx={1} fill="rgba(255,228,160,0.22)" />
        {/* Left-edge shine */}
        <Line x1={6} y1={18} x2={6} y2={50} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
        {/* Bottom refraction */}
        <Line x1={8} y1={50} x2={24} y2={50} stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
        {isSelected && <Circle cx={27} cy={5} r={4} fill="#4cde80" stroke="#0b0a17" strokeWidth={1.1} />}
      </Svg>
    );
  }

  if (id === '2') { // Ginger Ale — aluminium soda can
    return (
      <Svg width={32} height={54} viewBox="0 0 32 54">
        {/* Top dome */}
        <Path d={`M 9 9 Q 9 4 ${cx} 4 Q 23 4 23 9`} fill={color} opacity={0.80} />
        <Ellipse cx={cx} cy={9} rx={7} ry={2} fill={color} />
        {/* Pull-tab */}
        <Path d={`M 14 5 Q ${cx} 3 18 5 L 18 8 L 14 8 Z`}
          fill="rgba(210,220,30,0.72)" stroke="rgba(255,255,255,0.20)" strokeWidth={0.6} />
        {/* Can body */}
        <SvgRect x={9} y={9} width={14} height={37} fill={color} />
        {/* Bottom dome */}
        <Ellipse cx={cx} cy={46} rx={7} ry={2} fill={color} opacity={0.65} />
        {/* Brand label stripe */}
        <SvgRect x={9} y={21} width={14} height={13} fill="rgba(255,255,255,0.14)" />
        {/* Lower info band */}
        <SvgRect x={9} y={36} width={14} height={6} fill="rgba(255,255,255,0.07)" />
        {/* Vertical shine */}
        <Line x1={10} y1={11} x2={10} y2={44} stroke="rgba(255,255,255,0.24)" strokeWidth={1.5} />
        {isSelected && <Circle cx={24} cy={5} r={4} fill="#4cde80" stroke="#0b0a17" strokeWidth={1.1} />}
      </Svg>
    );
  }

  if (id === '3') { // Grapefruit Syrup — French-style glass bottle
    return (
      <Svg width={32} height={54} viewBox="0 0 32 54">
        {/* Foil-wrapped cap */}
        <Path d="M 13 1 L 19 1 L 20 6 L 12 6 Z" fill="#881808" />
        <Line x1={12} y1={6} x2={20} y2={6} stroke="#cc2818" strokeWidth={0.8} />
        {/* Neck */}
        <SvgRect x={13} y={6} width={6} height={7} fill={color} opacity={0.85} />
        {/* Body — slightly wider than neck */}
        <Path d="M 13 13 Q 8 14 7 18 L 7 50 Q 7 52 9 52 L 23 52 Q 25 52 25 50 L 25 18 Q 24 14 19 13 Z"
          fill={color} stroke="rgba(255,255,255,0.10)" strokeWidth={0.7} />
        {/* Label */}
        <SvgRect x={9} y={20} width={14} height={22} rx={1} fill="rgba(255,190,130,0.20)" />
        {/* Citrus slice on label */}
        <Circle cx={cx} cy={31} r={5} fill="none" stroke="rgba(255,180,90,0.38)" strokeWidth={1.2} />
        <Line x1={cx} y1={26} x2={cx} y2={36} stroke="rgba(255,180,90,0.25)" strokeWidth={0.7} />
        <Line x1={11} y1={31} x2={21} y2={31} stroke="rgba(255,180,90,0.25)" strokeWidth={0.7} />
        {/* Shine */}
        <Line x1={9} y1={19} x2={9} y2={50} stroke="rgba(255,255,255,0.13)" strokeWidth={1.5} />
        {isSelected && <Circle cx={24} cy={5} r={4} fill="#4cde80" stroke="#0b0a17" strokeWidth={1.1} />}
      </Svg>
    );
  }

  if (id === '4') { // Espresso — squat dark coffee jar
    return (
      <Svg width={32} height={54} viewBox="0 0 32 54">
        {/* Wide ridged screw cap */}
        <SvgRect x={7} y={1} width={18} height={8} rx={2} fill="#0d0503" />
        <Line x1={11} y1={1} x2={11} y2={9} stroke="rgba(255,255,255,0.07)" strokeWidth={0.7} />
        <Line x1={16} y1={1} x2={16} y2={9} stroke="rgba(255,255,255,0.07)" strokeWidth={0.7} />
        <Line x1={21} y1={1} x2={21} y2={9} stroke="rgba(255,255,255,0.07)" strokeWidth={0.7} />
        {/* Squat wide body */}
        <Path d="M 7 9 L 3 12 L 3 50 Q 3 52 6 52 L 26 52 Q 29 52 29 50 L 29 12 L 25 9 Z"
          fill={color} stroke="rgba(255,255,255,0.08)" strokeWidth={0.7} />
        {/* Label */}
        <SvgRect x={5} y={17} width={22} height={26} rx={1} fill="rgba(200,150,80,0.17)" />
        {/* Coffee crema oval */}
        <Ellipse cx={cx} cy={30} rx={6} ry={4} fill="rgba(180,120,50,0.22)" />
        {/* Shine */}
        <Line x1={5} y1={13} x2={5} y2={50} stroke="rgba(255,255,255,0.09)" strokeWidth={1.5} />
        {isSelected && <Circle cx={27} cy={5} r={4} fill="#4cde80" stroke="#0b0a17" strokeWidth={1.1} />}
      </Svg>
    );
  }

  if (id === '5') { // Lime Juice — green plastic squeeze bottle
    return (
      <Svg width={32} height={54} viewBox="0 0 32 54">
        {/* Narrow pour spout */}
        <Path d="M 14 1 Q 13 1 13 3 L 13 10 L 19 10 L 19 3 Q 19 1 18 1 Z"
          fill="#185008" stroke="rgba(255,255,255,0.10)" strokeWidth={0.6} />
        {/* Rounded squeeze body */}
        <Path d="M 13 10 Q 6 12 5 17 L 5 49 Q 5 52 8 52 L 24 52 Q 27 52 27 49 L 27 17 Q 26 12 19 10 Z"
          fill={color} stroke="rgba(255,255,255,0.12)" strokeWidth={0.7} />
        {/* Label */}
        <SvgRect x={7} y={20} width={18} height={24} rx={2} fill="rgba(200,255,130,0.18)" />
        {/* Lime slice */}
        <Circle cx={cx} cy={32} r={6} fill="none" stroke="rgba(180,255,80,0.32)" strokeWidth={1.2} />
        <Circle cx={cx} cy={32} r={3} fill="rgba(180,255,80,0.18)" />
        <Line x1={cx} y1={26} x2={cx} y2={38} stroke="rgba(180,255,80,0.22)" strokeWidth={0.7} />
        <Line x1={10} y1={32} x2={22} y2={32} stroke="rgba(180,255,80,0.22)" strokeWidth={0.7} />
        {/* Shine */}
        <Line x1={7} y1={18} x2={7} y2={49} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
        {isSelected && <Circle cx={25} cy={6} r={4} fill="#4cde80" stroke="#0b0a17" strokeWidth={1.1} />}
      </Svg>
    );
  }

  // Generic fallback
  return (
    <Svg width={32} height={54} viewBox="0 0 32 54">
      <Path
        d="M 11 1 L 21 1 L 21 5 Q 21 7 20 8 L 20 14 Q 26 16 26 21 L 26 48 Q 26 52 22 52 L 10 52 Q 6 52 6 48 L 6 21 Q 6 16 12 14 L 12 8 Q 11 7 11 5 Z"
        fill={color} opacity={isSelected ? 1 : 0.75}
        stroke="rgba(255,255,255,0.14)" strokeWidth={0.7}
      />
      {isSelected && <Circle cx={25} cy={5} r={4} fill="#4cde80" stroke="#0b0a17" strokeWidth={1.1} />}
    </Svg>
  );
}



interface GlassEnvelope {
  minParts: number;
  maxParts: number;
  minAbv: number;
  maxAbv: number;
}
const GLASS_ENVELOPES: Record<GlassType, GlassEnvelope> = {
  rocks:    { minParts: 4,  maxParts: 6,  minAbv: 25, maxAbv: 35 },
  highball: { minParts: 10, maxParts: 12, minAbv: 8,  maxAbv: 15 },
  martini:  { minParts: 5,  maxParts: 6,  minAbv: 25, maxAbv: 32 },
  shot:     { minParts: 2,  maxParts: 3,  minAbv: 35, maxAbv: 50 }
};

function MixSimulator({ selected, lang, onReset, onStageChange, onSaveRecipe }: {
  selected: MixIngredient[];
  lang: 'en' | 'ko';
  onReset: () => void;
  onStageChange?: (stage: SimStage) => void;
  onSaveRecipe?: (glass: GlassType, ice: number) => void;
}) {
  const isDark = useIsDark();
  const { selections, addPart, removeIngredient, iceCount, setIceCount, iceType, setIceType, glassType, setGlassType } = useMixStore();
  const [stage,     setStage]     = useState<SimStage>('select');

  // ── Straw stirring ──
  const stirXAnim    = useRef(new Animated.Value(0)).current;
  const stirDistRef  = useRef(0);
  const lastXRef     = useRef<number | null>(null);
  const stirProgRef  = useRef(0);
  const [stirProg, setStirProg] = useState(0);
  const wtRef = useRef(68);

  useEffect(() => {
    onStageChange?.(stage);
  }, [stage, onStageChange]);

  useEffect(() => {
    if (stage !== 'mix') return;
    stirDistRef.current = 0;
    lastXRef.current    = null;
    stirProgRef.current = 0;
    setStirProg(0);
    stirXAnim.setValue(0);
  }, [stage]);

  const stirPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (_e, gs) => {
      lastXRef.current = gs.x0;
    },
    onPanResponderMove: (_e, gs) => {
      if (lastXRef.current !== null) {
        stirDistRef.current += Math.abs(gs.moveX - lastXRef.current);
        lastXRef.current = gs.moveX;
        const p = Math.min(100, Math.round(stirDistRef.current / 3));
        if (p !== stirProgRef.current) {
          stirProgRef.current = p;
          setStirProg(p);
        }
      }
      const hw = wtRef.current - 14;
      stirXAnim.setValue(Math.max(-hw, Math.min(hw, gs.dx)));
    },
    onPanResponderRelease: () => {
      Animated.spring(stirXAnim, {
        toValue: 0, useNativeDriver: true, tension: 80, friction: 6,
      }).start();
      lastXRef.current = null;
    },
  })).current;

  const SIM_H     = 480;
  const W         = SCREEN_W;
  const CX        = W / 2;
  const SHELF_Y   = 152;

  const gs  = GLASS_SPECS[glassType];
  const { GT, GB, WT, WB } = gs;
  wtRef.current = WT;
  const LB  = GB - 5;

  const envelope = GLASS_ENVELOPES[glassType];
  const maxParts = envelope.maxParts;

  const totalParts = selections.reduce((a, b) => a + b.parts, 0);
  const totalLiquidHeight = LB - GT - 16;
  const liquidTopY = totalParts > 0
    ? Math.max(GT + 8, LB - (Math.min(maxParts, totalParts) / maxParts) * totalLiquidHeight)
    : LB;

  const hwY   = (y: number) => WB + (WT - WB) * (GB - y) / (GB - GT);
  const lPath = (yT: number, yB: number) => {
    const hw1 = hwY(yT), hw2 = hwY(yB);
    return `M ${CX-hw1} ${yT} L ${CX+hw1} ${yT} L ${CX+hw2} ${yB} L ${CX-hw2} ${yB} Z`;
  };

  const { currentAbv, sugarAcidRatio, balanceText, coachHint } = useMemo(() => {
    let sumParts = 0;
    let sumAbv = 0;
    let sumSugar = 0;
    let sumAcid = 0;
    
    selections.forEach(sel => {
      const ing = selected.find(x => x.id === sel.ingredientId);
      if (ing) {
        sumParts += sel.parts;
        sumAbv += sel.parts * ing.abv;
        sumSugar += sel.parts * ing.sugar;
        sumAcid += sel.parts * ing.acid;
      }
    });

    if (sumParts === 0) {
      return {
        currentAbv: 0,
        sugarAcidRatio: 1,
        balanceText: lang === 'ko' ? '재료 없음' : 'Empty',
        coachHint: lang === 'ko' ? '선반의 술병을 눌러 잔에 따라주세요.' : 'Tap a bottle on the shelf to pour.'
      };
    }

    const rawAbv = sumAbv / sumParts;
    const dilutionFactor = 1 / (1 + iceEffCount(iceType, iceCount) * 0.08);
    const finalAbv = rawAbv * dilutionFactor;

    const avgSugar = sumSugar / sumParts;
    const avgAcid = sumAcid / sumParts;
    const ratio = avgAcid > 0 ? avgSugar / avgAcid : avgSugar;

    let balKo = '보통';
    let balEn = 'Medium';
    let hintKo = '';
    let hintEn = '';

    if (ratio > 1.5) {
      balKo = '단맛 과다';
      balEn = 'Sweet Heavy';
      hintKo = '단맛에 비해 산미가 부족합니다. 레몬/라임 주스를 더해보세요.';
      hintEn = 'Too sweet. Try adding lemon or lime juice to balance it.';
    } else if (ratio < 0.8) {
      balKo = '신맛 과다';
      balEn = 'Sour Heavy';
      hintKo = '산미가 너무 강합니다. 시럽을 더해 단맛을 보강하세요.';
      hintEn = 'Too sour. Add some syrup to balance the acidity.';
    } else {
      balKo = '완벽한 균형';
      balEn = 'Perfect Balance';
      hintKo = '단맛과 신맛의 밸런스가 아주 좋습니다!';
      hintEn = 'Sweet and sour are in perfect harmony!';
    }

    if (finalAbv > envelope.maxAbv) {
      hintKo = '도수가 매우 높습니다. 탄산수를 더해 길게 늘여보세요.';
      hintEn = 'Alcohol is very strong. Pour some soda water to dilute.';
    } else if (finalAbv < envelope.minAbv && sumParts >= envelope.minParts) {
      hintKo = '칵테일이 조금 묽습니다. 베이스 술을 더 추가해보세요.';
      hintEn = 'A bit light. Add more base spirit to boost the strength.';
    }

    return {
      currentAbv: finalAbv,
      sugarAcidRatio: ratio,
      balanceText: lang === 'ko' ? balKo : balEn,
      coachHint: lang === 'ko' ? hintKo : hintEn
    };
  }, [selections, selected, iceCount, glassType, lang, envelope]);


  const handleReset = () => {
    setStage('select'); setGlassType('rocks'); setIceCount(0);
    onReset();
  };

  const stageIdx    = SIM_STAGES.indexOf(stage);
  const stageLabels = lang === 'ko'
    ? ['잔 선택', '얼음', '재료 투입', '믹스', '완성']
    : ['Glass', 'Ice', 'Pour', 'Mix', 'Serve'];
  const showGlass  = true;
  const showLiquid = stage === 'pour' || stage === 'mix' || stage === 'serve';
  const showShelf  = stage === 'pour';

  return (
    <View style={{ position: 'relative', height: SIM_H }}>

      {/* ══ STATIC SVG BACKGROUND ══ */}
      <Svg width={W} height={SIM_H} viewBox={`0 0 ${W} ${SIM_H}`}
        style={{ position: 'absolute', top: 0, left: 0 }}>
        <SvgRect x={0} y={0} width={W} height={SIM_H} fill={isDark ? '#0b0a17' : '#141220'} />

        {/* Shelf plank */}
        {showShelf && (
          <>
            <SvgRect x={12} y={SHELF_Y} width={W-24} height={10} rx={2} fill="#2e2010" />
            <Line x1={12} y1={SHELF_Y} x2={W-12} y2={SHELF_Y} stroke="#5a3e1e" strokeWidth={1} />
          </>
        )}

        {/* Working floor */}
        {showGlass && (
          <SvgRect x={0} y={showShelf ? SHELF_Y+10 : 0} width={W} height={SIM_H} fill="#0f0d1a" />
        )}

        {/* Counter */}
        {showGlass && (
          <>
            <SvgRect x={0} y={420} width={W} height={SIM_H-420} fill="#18100a" />
            <SvgRect x={0} y={420} width={W} height={5} fill="#2e2010" />
            <Line x1={0} y1={420} x2={W} y2={420} stroke="#5a3e1e" strokeWidth={2} />
          </>
        )}

        {/* Liquid layers */}
        {showLiquid && (() => {
          let accumulatedParts = 0;
          return selections.map((sel) => {
            const ing = selected.find(x => x.id === sel.ingredientId);
            if (!ing) return null;
            
            const startParts = accumulatedParts;
            const endParts = accumulatedParts + sel.parts;
            accumulatedParts += sel.parts;
            
            const clampStart = Math.min(maxParts, startParts);
            const clampEnd = Math.min(maxParts, endParts);
            
            const yBot = LB - (clampStart / maxParts) * totalLiquidHeight;
            const yTop = LB - (clampEnd / maxParts) * totalLiquidHeight;
            
            return <Path key={sel.ingredientId} d={lPath(yTop, yBot)} fill={ing.color} opacity={0.82} />;
          });
        })()}

        {/* Liquid surface sheen */}
        {showLiquid && totalParts > 0 && (
          <Line
            x1={CX - hwY(liquidTopY) + 6} y1={liquidTopY}
            x2={CX + hwY(liquidTopY) - 6} y2={liquidTopY}
            stroke="rgba(255,255,255,0.30)" strokeWidth={1.5}
          />
        )}

        {/* Glass interior clipPath */}
        <Defs>
          <ClipPath id="glassClip">
            <Path d={`M ${CX-WT+2} ${GT+2} L ${CX+WT-2} ${GT+2} L ${CX+WB-1} ${GB-2} L ${CX-WB+1} ${GB-2} Z`} />
          </ClipPath>
        </Defs>

        {/* Ice — type-based rendering, clipped to glass interior */}
        {showGlass && iceType !== 'none' && (
          <G clipPath="url(#glassClip)">
          {(() => {
          if (iceType === 'large') {
            const iw = 38;
            const ih = 38;
            const iy = GB - ih - 4;
            const ix = CX - iw / 2;
            return (
              <>
                <Defs>
                  <LinearGradient id="iceLg" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0"   stopColor="rgba(255,255,255,0.38)" />
                    <Stop offset="0.4" stopColor="rgba(205,242,255,0.20)" />
                    <Stop offset="1"   stopColor="rgba(160,222,252,0.08)" />
                  </LinearGradient>
                </Defs>
                <SvgRect x={ix} y={iy} width={iw} height={ih} rx={5}
                  fill="url(#iceLg)" stroke="rgba(255,255,255,0.34)" strokeWidth={1.1} />
                <Line x1={ix+5} y1={iy+4} x2={ix+iw-10} y2={iy+2}
                  stroke="rgba(255,255,255,0.50)" strokeWidth={0.9} />
                <Line x1={ix+4} y1={iy+5} x2={ix+4} y2={iy+ih-5}
                  stroke="rgba(255,255,255,0.30)" strokeWidth={0.8} />
                <Line x1={ix+iw*0.4} y1={iy+7} x2={ix+iw*0.7} y2={iy+ih*0.55}
                  stroke="rgba(255,255,255,0.18)" strokeWidth={0.7} />
              </>
            );
          }
          if (iceType === 'sphere') {
            const r  = 22;
            const cy = GB - r - 6;
            return (
              <>
                <Defs>
                  <RadialGradient id="iceSph" cx="0.35" cy="0.28" r="0.72" fx="0.35" fy="0.28">
                    <Stop offset="0"    stopColor="rgba(255,255,255,0.48)" />
                    <Stop offset="0.22" stopColor="rgba(228,248,255,0.30)" />
                    <Stop offset="0.60" stopColor="rgba(185,232,254,0.14)" />
                    <Stop offset="1"    stopColor="rgba(140,204,242,0.05)" />
                  </RadialGradient>
                </Defs>
                <Circle cx={CX} cy={cy} r={r}
                  fill="url(#iceSph)" stroke="rgba(255,255,255,0.28)" strokeWidth={1.0} />
                <Path
                  d={`M ${CX - r*0.52} ${cy - r*0.36} Q ${CX - r*0.08} ${cy - r*0.72} ${CX + r*0.38} ${cy - r*0.44}`}
                  fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={1.2} strokeLinecap="round" />
                <Circle cx={CX - r*0.30} cy={cy - r*0.32} r={r*0.08}
                  fill="rgba(255,255,255,0.62)" />
              </>
            );
          }
          if (iceType === 'crushed') {
            const pieces = [
              { dx:-16, dy:-10, w:11, h:7,  rot:-14 }, { dx: 3,  dy:-8,  w:9,  h:6,  rot: 9 },
              { dx:-7,  dy:-22, w:10, h:6,  rot:-6  }, { dx:-22, dy:-24, w:8,  h:5,  rot:18 },
              { dx: 9,  dy:-22, w:9,  h:5,  rot:-20 }, { dx:-3,  dy:-36, w:8,  h:5,  rot: 7 },
              { dx:-18, dy:-36, w:9,  h:4,  rot:-22 }, { dx: 8,  dy:-40, w:7,  h:5,  rot:14 },
              { dx:-26, dy:-12, w:7,  h:4,  rot: 24 }, { dx: 14, dy:-32, w:8,  h:4,  rot:-10 },
              { dx:-12, dy:-48, w:7,  h:4,  rot: 5  }, { dx: 2,  dy:-52, w:6,  h:4,  rot:-16 },
            ];
            return (
              <>
                {pieces.map((p, i) => (
                  <SvgRect key={i}
                    x={CX + p.dx} y={GB + p.dy} width={p.w} height={p.h} rx={1.5}
                    fill="rgba(218,244,255,0.26)" stroke="rgba(255,255,255,0.30)" strokeWidth={0.7}
                    transform={`rotate(${p.rot} ${CX + p.dx + p.w/2} ${GB + p.dy + p.h/2})`}
                  />
                ))}
              </>
            );
          }
          // cubed
          const cubeOffsets = [
            { dx: -22, dy: -22, w: 20, h: 14 },
            { dx:   3, dy: -24, w: 18, h: 13 },
            { dx: -10, dy: -38, w: 17, h: 12 },
            { dx: -25, dy: -40, w: 16, h: 11 },
            { dx:   5, dy: -42, w: 15, h: 11 },
          ];
          return (
            <>
              <Defs>
                <LinearGradient id="iceCb" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0"   stopColor="rgba(255,255,255,0.36)" />
                  <Stop offset="0.5" stopColor="rgba(208,240,255,0.18)" />
                  <Stop offset="1"   stopColor="rgba(170,222,252,0.07)" />
                </LinearGradient>
              </Defs>
              {cubeOffsets.slice(0, iceCount).map((c, i) => (
                <SvgRect key={i}
                  x={CX + c.dx} y={GB + c.dy} width={c.w} height={c.h} rx={2.5}
                  fill="url(#iceCb)" stroke="rgba(255,255,255,0.28)" strokeWidth={0.9}
                />
              ))}
            </>
          );
        })()}
          </G>
        )}

        {/* Glass body */}
        {showGlass && (
          <>
            <Path
              d={`M ${CX-WT} ${GT} L ${CX+WT} ${GT} L ${CX+WB} ${GB} L ${CX-WB} ${GB} Z`}
              fill="rgba(255,255,255,0.022)" stroke="rgba(255,255,255,0.22)" strokeWidth={1.5}
            />
            {WB > 10 && (
              <Path
                d={`M ${CX-WT+3} ${GT+5} L ${CX-WT+7} ${GT+5} L ${CX-WB+6} ${GB-22} L ${CX-WB+2} ${GB-22} Z`}
                fill="rgba(255,255,255,0.07)"
              />
            )}
            {glassType === 'martini' && (
              <>
                <Line x1={CX} y1={GB} x2={CX} y2={GB+20}
                  stroke="rgba(255,255,255,0.28)" strokeWidth={2.0} />
                <Line x1={CX-20} y1={GB+20} x2={CX+20} y2={GB+20}
                  stroke="rgba(255,255,255,0.32)" strokeWidth={2.0} strokeLinecap="round" />
              </>
            )}
            <Line x1={CX-WT} y1={GT} x2={CX+WT} y2={GT}
              stroke="rgba(255,255,255,0.38)" strokeWidth={2.5} strokeLinecap="round" />
          </>
        )}

        {/* Drop-hint arrow */}
        {stage === 'pour' && totalParts === 0 && (
          <>
            <Line x1={CX} y1={GT-42} x2={CX} y2={GT-14}
              stroke="rgba(255,255,255,0.16)" strokeWidth={1.5} strokeDasharray="4 3" />
            <Path d={`M ${CX-6} ${GT-15} L ${CX} ${GT-7} L ${CX+6} ${GT-15}`}
              stroke="rgba(255,255,255,0.16)" strokeWidth={1.5} fill="none" strokeLinejoin="round" />
          </>
        )}

        {/* Serve garnish */}
        {stage === 'serve' && selected.length > 0 && (
          <>
            <Circle cx={CX+36} cy={GT-14} r={17} fill={selected[0].color} opacity={0.18} />
            <Circle cx={CX+36} cy={GT-14} r={8}  fill={selected[0].color} opacity={0.50} />
            <Line x1={CX+36} y1={GT-6} x2={CX+WT-6} y2={GB-38}
              stroke="#d4a830" strokeWidth={2.5} strokeLinecap="round" />
          </>
        )}
      </Svg>

      {/* ══ STRAW (MIX stage) ══ */}
      {stage === 'mix' && (
        <Animated.View
          {...stirPan.panHandlers}
          style={{
            position: 'absolute',
            top: GT - 60,
            left: CX - 22,
            width: 44,
            alignItems: 'center',
            height: GB - GT + 60,
            transform: [{ translateX: stirXAnim }],
            zIndex: 30,
          }}
        >
          {/* straw body */}
          <View style={{
            width: 7, height: '100%', borderRadius: 4,
            backgroundColor: 'rgba(255,215,70,0.95)',
            overflow: 'hidden',
          }}>
            {/* candy stripe */}
            {Array.from({ length: 10 }).map((_, i) => (
              <View key={i} style={{
                height: 10, marginBottom: 10,
                backgroundColor: 'rgba(255,100,30,0.65)',
              }} />
            ))}
          </View>
        </Animated.View>
      )}

      {/* ══ STAGE: SELECT ══ */}
      {stage === 'select' && (
        <View style={{ position: 'absolute', top: 8, left: 10, right: 10 }}>
          <View style={{
            backgroundColor: 'rgba(10,8,22,0.82)', borderRadius: 16,
            padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
          }}>
            <Text style={{
              color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600',
              textAlign: 'center', marginBottom: 12, letterSpacing: 0.2,
            }}>
              {lang === 'ko' ? '사용할 잔을 골라주세요' : 'Choose your glass'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              {(['rocks', 'highball', 'martini', 'shot'] as GlassType[]).map(gt => {
                const th = GLASS_THUMB[gt];
                const sp = GLASS_SPECS[gt];
                const on = glassType === gt;
                const tCX = 25;
                return (
                  <TouchableOpacity key={gt} onPress={() => setGlassType(gt)}
                    style={{
                      flex: 1, maxWidth: 84, alignItems: 'center', gap: 4,
                      paddingHorizontal: 6, paddingVertical: 8,
                      borderRadius: 12, borderWidth: 1.5,
                      borderColor: on ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.12)',
                      backgroundColor: on ? 'rgba(255,255,255,0.08)' : 'transparent',
                    }}
                  >
                    <Svg width={50} height={70} viewBox="0 0 50 74">
                      <Path
                        d={`M ${tCX-th.tWT} ${th.tGT} L ${tCX+th.tWT} ${th.tGT} L ${tCX+th.tWB} ${th.tGB} L ${tCX-th.tWB} ${th.tGB} Z`}
                        fill={on ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)'}
                        stroke={on ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.26)'}
                        strokeWidth={1.2}
                      />
                      {gt === 'martini' && (
                        <>
                          <Line x1={tCX} y1={th.tGB} x2={tCX} y2={th.tGB+7}
                            stroke={on ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)'} strokeWidth={1.2} />
                          <Line x1={tCX-9} y1={th.tGB+7} x2={tCX+9} y2={th.tGB+7}
                            stroke={on ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)'}
                            strokeWidth={1.2} strokeLinecap="round" />
                        </>
                      )}
                      <Line x1={tCX-th.tWT} y1={th.tGT} x2={tCX+th.tWT} y2={th.tGT}
                        stroke={on ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.36)'}
                        strokeWidth={2} strokeLinecap="round" />
                    </Svg>
                    <Text style={{ fontSize: 9, fontWeight: on ? '700' : '400', color: on ? '#fff' : 'rgba(255,255,255,0.42)' }}>
                      {lang === 'ko' ? sp.labelKo : sp.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={() => setStage('prep')}
              style={{ marginTop: 12, paddingVertical: 11, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.11)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)', alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{lang === 'ko' ? '다음 →' : 'Next →'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ══ STAGE: PREP (ice type) ══ */}
      {stage === 'prep' && (
        <View style={{ position: 'absolute', top: 8, left: 10, right: 10 }}>
          <View style={{
            backgroundColor: 'rgba(10,8,22,0.82)', borderRadius: 16,
            padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
          }}>
          <Text style={{
            color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600',
            textAlign: 'center', marginBottom: 10, letterSpacing: 0.2,
          }}>
            {lang === 'ko' ? '얼음 종류를 선택하세요' : 'Choose your ice type'}
          </Text>

          {/* Ice type selector cards — same row layout as glass selector */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
            {ICE_TYPES.map(it => {
              const on = iceType === it.id;
              return (
                <TouchableOpacity
                  key={it.id}
                  onPress={() => setIceType(it.id)}
                  style={{
                    width: 70, alignItems: 'center', gap: 4,
                    paddingTop: 10, paddingBottom: 8, paddingHorizontal: 6,
                    borderRadius: 14, borderWidth: 1.5,
                    borderColor: on ? 'rgba(200,238,255,0.80)' : 'rgba(255,255,255,0.12)',
                    backgroundColor: on ? 'rgba(180,228,255,0.10)' : 'transparent',
                  }}
                >
                  <Svg width={42} height={36} viewBox="0 0 42 36">
                    {it.id === 'none' && (
                      <>
                        <Circle cx={21} cy={18} r={13}
                          fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.2} strokeDasharray="3 2.5" />
                        <Line x1={10} y1={10} x2={32} y2={26}
                          stroke="rgba(255,255,255,0.20)" strokeWidth={1.2} strokeLinecap="round" />
                      </>
                    )}
                    {it.id === 'cubed' && (
                      <>
                        <Defs>
                          <LinearGradient id="pCb" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor="rgba(255,255,255,0.82)" />
                            <Stop offset="1" stopColor="rgba(180,228,255,0.28)" />
                          </LinearGradient>
                        </Defs>
                        <SvgRect x={3}  y={18} width={14} height={10} rx={2} fill="url(#pCb)" stroke="rgba(255,255,255,0.60)" strokeWidth={0.8} />
                        <SvgRect x={19} y={16} width={12} height={10} rx={2} fill="url(#pCb)" stroke="rgba(255,255,255,0.60)" strokeWidth={0.8} />
                        <SvgRect x={10} y={8}  width={13} height={10} rx={2} fill="url(#pCb)" stroke="rgba(255,255,255,0.55)" strokeWidth={0.8} />
                      </>
                    )}
                    {it.id === 'large' && (
                      <>
                        <Defs>
                          <LinearGradient id="pLg" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor="rgba(255,255,255,0.80)" />
                            <Stop offset="1" stopColor="rgba(175,225,255,0.22)" />
                          </LinearGradient>
                        </Defs>
                        <SvgRect x={4} y={7} width={34} height={22} rx={4} fill="url(#pLg)" stroke="rgba(255,255,255,0.65)" strokeWidth={1.0} />
                        <Line x1={7} y1={10} x2={36} y2={8}   stroke="rgba(255,255,255,0.48)" strokeWidth={0.8} />
                        <Line x1={6} y1={10} x2={6}  y2={27}  stroke="rgba(255,255,255,0.28)" strokeWidth={0.7} />
                      </>
                    )}
                    {it.id === 'sphere' && (
                      <>
                        <Defs>
                          <RadialGradient id="pSph" cx="0.36" cy="0.30" r="0.70" fx="0.36" fy="0.30">
                            <Stop offset="0"   stopColor="rgba(255,255,255,0.92)" />
                            <Stop offset="0.4" stopColor="rgba(215,244,255,0.55)" />
                            <Stop offset="1"   stopColor="rgba(160,210,248,0.12)" />
                          </RadialGradient>
                        </Defs>
                        <Circle cx={21} cy={18} r={15} fill="url(#pSph)" stroke="rgba(255,255,255,0.58)" strokeWidth={0.9} />
                        <Path d="M 12 11 Q 18 6 26 10" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth={1.1} strokeLinecap="round" />
                        <Circle cx={14} cy={12} r={2} fill="rgba(255,255,255,0.55)" />
                      </>
                    )}
                    {it.id === 'crushed' && (
                      <>
                        {[
                          { x: 4,  y: 20, w: 10, h: 6,  r: -14 },
                          { x: 16, y: 18, w: 8,  h: 5,  r:  10 },
                          { x: 26, y: 22, w: 9,  h: 5,  r: -18 },
                          { x: 8,  y: 10, w: 8,  h: 5,  r:  16 },
                          { x: 20, y: 9,  w: 9,  h: 5,  r:  -8 },
                          { x: 30, y: 11, w: 7,  h: 4,  r:  20 },
                        ].map((p, i) => (
                          <SvgRect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={1.5}
                            fill="rgba(218,244,255,0.62)" stroke="rgba(255,255,255,0.65)" strokeWidth={0.7}
                            transform={`rotate(${p.r} ${p.x + p.w/2} ${p.y + p.h/2})`}
                          />
                        ))}
                      </>
                    )}
                  </Svg>
                  <Text style={{
                    fontSize: 10, fontWeight: on ? '700' : '400',
                    color: on ? 'rgba(200,238,255,0.96)' : 'rgba(255,255,255,0.42)',
                    textAlign: 'center',
                  }}>
                    {lang === 'ko' ? it.label : it.labelEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cube count stepper */}
          {iceType === 'cubed' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 18 }}>
              <TouchableOpacity
                onPress={() => setIceCount(c => Math.max(1, c - 1))}
                style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 18, lineHeight: 22 }}>−</Text>
              </TouchableOpacity>
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 24 }}>{iceCount}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 9, fontWeight: '600' }}>
                  {lang === 'ko' ? '개' : 'cubes'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIceCount(c => Math.min(5, c + 1))}
                style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 18, lineHeight: 22 }}>+</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Nav */}
          <TouchableOpacity
            onPress={() => setStage('pour')}
            style={{ marginTop: 26, marginHorizontal: 18, paddingVertical: 13, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.11)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)', alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{lang === 'ko' ? '다음 →' : 'Next →'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStage('select')} style={{ marginTop: 10, alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 13 }}>← {lang === 'ko' ? '뒤로' : 'Back'}</Text>
          </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ══ STAGE: POUR ══ */}
      {stage === 'pour' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' }}>
          
          {/* Pourable Bottles on Shelf */}
          <View style={{
            position: 'absolute', top: 54, left: 0, right: 0,
            flexDirection: 'row', justifyContent: 'center', gap: 14,
            paddingHorizontal: 16, pointerEvents: 'box-none'
          }}>
            {selected.length === 0 ? (
              <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, fontWeight: '600', marginTop: 10 }}>
                {lang === 'ko' ? '아래 목록에서 믹싱할 재료를 선택해주세요.' : 'Please select ingredients below.'}
              </Text>
            ) : (
              selected.map((ing) => {
                const sel = selections.find(x => x.ingredientId === ing.id);
                const parts = sel ? sel.parts : 0;
                return (
                  <View key={ing.id} style={{ alignItems: 'center', width: 56, position: 'relative' }}>
                    <TouchableOpacity
                      onPress={() => {
                        if (totalParts < maxParts) {
                          addPart(ing.id);
                        } else {
                          Alert.alert(lang === 'ko' ? '용량 가득 참' : 'Glass Full', lang === 'ko' ? '선택하신 잔의 최대 용량에 도달했습니다.' : 'You have reached the maximum parts for this glass.');
                        }
                      }}
                      style={{ alignItems: 'center' }}
                    >
                      <BottleSvg ingredient={ing} isSelected={parts > 0} />
                      <Text style={{ fontSize: 9, color: parts > 0 ? '#4cde80' : '#fff', fontWeight: 'bold', marginTop: 2 }}>
                        {parts > 0 ? `${parts} Parts` : '+ Pour'}
                      </Text>
                      <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', marginTop: 1, textAlign: 'center', width: 56 }} numberOfLines={1}>
                        {lang === 'ko' ? ing.nameKo : ing.name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                    {parts > 0 && (
                      <TouchableOpacity
                        onPress={() => removeIngredient(ing.id)}
                        style={{
                          position: 'absolute', top: -6, right: -4,
                          width: 18, height: 18, borderRadius: 9,
                          backgroundColor: 'rgba(255,80,80,0.85)',
                          alignItems: 'center', justifyContent: 'center', zIndex: 12
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold', lineHeight: 11 }}>−</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>


          {/* Real-time Coach Bar */}
          {selected.length > 0 && (
            <View style={{
              position: 'absolute', bottom: 78, left: 24, right: 24,
              backgroundColor: 'rgba(15,13,26,0.85)', padding: 10, borderRadius: 12,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', pointerEvents: 'none'
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>ABV</Text>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                  {Math.round(currentAbv)}%
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                <View style={{
                  width: `${Math.min(100, (currentAbv / 40) * 100)}%`, height: '100%',
                  backgroundColor: (currentAbv >= envelope.minAbv && currentAbv <= envelope.maxAbv) ? '#4cde80' : '#ffb830'
                }} />
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                  {lang === 'ko' ? '단맛/산미 비율' : 'Sweet/Sour Balance'}
                </Text>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                  {balanceText}
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{
                  width: `${Math.min(100, (sugarAcidRatio / 3) * 100)}%`, height: '100%',
                  backgroundColor: (sugarAcidRatio >= 0.8 && sugarAcidRatio <= 1.5) ? '#4cde80' : '#ff6b6b'
                }} />
              </View>

              <Text style={{ color: '#ffb830', fontSize: 10, fontWeight: '600', marginTop: 8, textAlign: 'center' }}>
                {coachHint}
              </Text>
            </View>
          )}

          <View style={{
            position: 'absolute', bottom: 22, left: 20, right: 20,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <TouchableOpacity onPress={() => setStage('prep')} style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
              <Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13 }}>
                ← {lang === 'ko' ? '뒤로' : 'Back'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { if (totalParts >= envelope.minParts) setStage('mix'); }}
              style={{
                paddingHorizontal: 22, paddingVertical: 11, borderRadius: 22,
                backgroundColor: totalParts >= envelope.minParts ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.04)',
                borderWidth: 1,
                borderColor: totalParts >= envelope.minParts ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.10)',
                opacity: totalParts >= envelope.minParts ? 1 : 0.45,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                {lang === 'ko' ? '믹스 단계로 →' : 'To Mix →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ══ STAGE: MIX ══ */}
      {stage === 'mix' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' }}>

          {/* 안내 / 완성 텍스트 */}
          <Text style={{
            position: 'absolute', top: GT - 88, left: 0, right: 0,
            textAlign: 'center', fontSize: 14, fontWeight: '700',
            color: stirProg >= 100 ? '#a8f0c0' : 'rgba(255,255,255,0.65)',
          }}>
            {stirProg >= 100
              ? (lang === 'ko' ? '완성됐어요! 🍹' : 'Ready to serve!')
              : (lang === 'ko' ? '스트로우를 좌우로 저어주세요' : 'Stir the straw left & right!')}
          </Text>

          {/* 진행 바 */}
          <View style={{
            position: 'absolute', top: GT - 66, left: 40, right: 40,
            height: 4, borderRadius: 2,
            backgroundColor: 'rgba(255,255,255,0.10)',
            overflow: 'hidden',
          }}>
            <View style={{
              width: `${stirProg}%`, height: 4, borderRadius: 2,
              backgroundColor: stirProg >= 100 ? '#a8f0c0' : 'rgba(168,240,192,0.65)',
            }} />
          </View>

          {/* 서브 버튼 — 완성 후에만 */}
          {stirProg >= 100 && (
            <View style={{ position: 'absolute', bottom: 22, left: 0, right: 0, alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => setStage('serve')}
                style={{
                  paddingHorizontal: 36, paddingVertical: 14, borderRadius: 26,
                  backgroundColor: 'rgba(168,240,192,0.13)',
                  borderWidth: 1.5, borderColor: 'rgba(168,240,192,0.52)',
                }}
              >
                <Text style={{ color: '#a8f0c0', fontSize: 15, fontWeight: '800' }}>
                  {lang === 'ko' ? '서브하기 →' : 'Serve →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={() => setStage('pour')}
            style={{ position: 'absolute', bottom: 38, left: 24 }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>←</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ══ STAGE: SERVE ══ */}
      {stage === 'serve' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' }}>
          <Text style={{
            position: 'absolute', top: GT - 88, left: 0, right: 0,
            textAlign: 'center', fontSize: 17, fontWeight: '900',
            color: 'rgba(255,255,255,0.90)', letterSpacing: -0.3,
          }}>
            {lang === 'ko' ? '완성된 칵테일' : 'Your Cocktail'}
          </Text>
          <Text style={{
            position: 'absolute', top: GT - 62, left: 0, right: 0,
            textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.38)', fontWeight: '500',
          }}>
            {lang === 'ko' ? gs.labelKo : gs.label}
            {' · '}{lang === 'ko' ? `재료 ${selected.length}가지` : `${selected.length} ingredient${selected.length !== 1 ? 's' : ''}`}
            {iceType !== 'none' ? ` · ${(() => { const it = ICE_TYPES.find(x => x.id === iceType); return lang === 'ko' ? it?.label : it?.labelEn; })()}${iceType === 'cubed' ? ` ×${iceCount}` : ''}` : ''}
          </Text>
          {/* 재료 목록 — 수평 스크롤로 버튼과 겹침 방지 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ position: 'absolute', bottom: 84, left: 0, right: 0 }}
            contentContainerStyle={{ paddingHorizontal: 18, gap: 8, alignItems: 'center' }}
          >
            {selected.map(ing => {
              const sel = selections.find(x => x.ingredientId === ing.id);
              const parts = sel ? sel.parts : 0;
              return (
                <View key={ing.id} style={{
                  paddingHorizontal: 11, paddingVertical: 5, borderRadius: 12,
                  backgroundColor: `${ing.color}1e`, borderWidth: 1, borderColor: `${ing.color}55`,
                }}>
                  <Text style={{ color: ing.color, fontSize: 11, fontWeight: '700' }}>
                    {lang === 'ko' ? ing.nameKo : ing.name.split(' ')[0]} ({parts}P)
                  </Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={{
            position: 'absolute', bottom: 16, left: 18, right: 18,
            flexDirection: 'row', gap: 10,
          }}>
            <TouchableOpacity
              onPress={handleReset}
              style={{
                flex: 1, paddingVertical: 13, borderRadius: 20,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center',
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.48)', fontSize: 13, fontWeight: '600' }}>
                {lang === 'ko' ? '다시 만들기' : 'Make Again'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onSaveRecipe?.(glassType, iceEffCount(iceType, iceCount));
              }}
              style={{
                flex: 1, paddingVertical: 13, borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)', alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                {lang === 'ko' ? '레시피 저장' : 'Save Recipe'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ══ STEP PROGRESS (always on top) ══ */}
      <View style={{
        position: 'absolute', top: 10, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        pointerEvents: 'none',
      }}>
        {SIM_STAGES.map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && (
              <View style={{
                width: 20, height: 1,
                backgroundColor: i <= stageIdx ? 'rgba(255,255,255,0.36)' : 'rgba(255,255,255,0.12)',
              }} />
            )}
            <View style={{
              width: 22, height: 22, borderRadius: 11,
              backgroundColor: i === stageIdx ? 'rgba(255,255,255,0.13)' : 'transparent',
              borderWidth: 1,
              borderColor: i === stageIdx
                ? 'rgba(255,255,255,0.65)'
                : i < stageIdx ? 'rgba(255,255,255,0.36)' : 'rgba(255,255,255,0.14)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{
                fontSize: 8, fontWeight: '700',
                color: i <= stageIdx ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.26)',
              }}>
                {i < stageIdx ? '✓' : `${i + 1}`}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>
      <View style={{ position: 'absolute', top: 36, left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' }}>
        <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', fontWeight: '600', letterSpacing: 1.4 }}>
          {stageLabels[stageIdx].toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

// 토글 열리는 즉시 자동재생·GIF처럼 반복
function RecipeSimAnimation({ recipe, lang }: { recipe: Recipe; lang: 'en' | 'ko' }) {
  const isDark  = useIsDark();
  const cx = 40, gt = 28, gb = 96, wt = 26, wb = 19;
  const liqH = gb - gt - 8;

  // JS-thread value: 액체 채우기 + 얼음 (useNativeDriver:false)
  const liquidProg = useRef(new Animated.Value(0)).current;
  // Native-thread value: 스트로우 좌우 흔들기 (useNativeDriver:true)
  const strawOsc   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mainLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(liquidProg, { toValue: 1, duration: 3400, useNativeDriver: false }),
        Animated.delay(350),
        Animated.timing(liquidProg, { toValue: 0, duration: 0,    useNativeDriver: false }),
      ])
    );
    const strawLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(strawOsc, { toValue: 1,  duration: 210, useNativeDriver: true }),
        Animated.timing(strawOsc, { toValue: -1, duration: 210, useNativeDriver: true }),
      ])
    );
    mainLoop.start();
    strawLoop.start();
    return () => { mainLoop.stop(); strawLoop.stop(); };
  }, []);

  // 페이즈 타임라인 (0–1):
  //  0.0–0.10 : 빈 잔
  //  0.10–0.45: 액체 채워짐
  //  0.45–0.60: 얼음 등장
  //  0.60–0.86: 스트로우 저음
  //  0.86–1.00: 완성

  const liquidH   = liquidProg.interpolate({ inputRange: [0.10, 0.45], outputRange: [0, liqH], extrapolate: 'clamp' });
  const iceOpacity= liquidProg.interpolate({ inputRange: [0.44, 0.60], outputRange: [0, 1],   extrapolate: 'clamp' });
  const strawVis  = liquidProg.interpolate({ inputRange: [0.58, 0.65, 0.87, 0.93], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' });
  const bgOpacity = liquidProg.interpolate({ inputRange: [0.3,  0.5],  outputRange: [0, 0.22], extrapolate: 'clamp' });
  const strawX    = strawOsc.interpolate({ inputRange: [-1, 1], outputRange: [-12, 12] });

  return (
    <View style={{ height: 140, backgroundColor: isDark ? '#0e0d1a' : '#16141f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {/* 배경 컬러 워시 */}
      <Animated.View style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 72,
        backgroundColor: recipe.color, opacity: bgOpacity,
      }} />

      <View style={{ position: 'relative', width: 80, height: 108 }}>
        {/* 액체 레이어 — 아래서 차오름 */}
        <Animated.View style={{
          position: 'absolute',
          bottom: 108 - gb,
          left: cx - wb + 1, width: (wb - 1) * 2,
          height: liquidH,
          backgroundColor: recipe.color,
          opacity: 0.80,
          borderBottomLeftRadius: 2, borderBottomRightRadius: 2,
        }} />

        {/* 얼음 */}
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, opacity: iceOpacity }}>
          <Svg width={80} height={108} viewBox="0 0 80 108">
            <SvgRect x={cx-13} y={gb-19} width={13} height={9} rx={2}
              fill="rgba(255,255,255,0.34)" stroke="rgba(255,255,255,0.45)" strokeWidth={0.7} />
            <SvgRect x={cx+3}  y={gb-21} width={11} height={8} rx={2}
              fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.38)" strokeWidth={0.7} />
          </Svg>
        </Animated.View>

        {/* 잔 외곽선 (항상 최상위) */}
        <Svg width={80} height={108} viewBox="0 0 80 108" style={{ position: 'absolute', top: 0, left: 0 }}>
          <Path d={`M ${cx-wt} ${gt} L ${cx+wt} ${gt} L ${cx+wb} ${gb} L ${cx-wb} ${gb} Z`}
            fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.28)" strokeWidth={1.5} />
          <Line x1={cx-wt} y1={gt} x2={cx+wt} y2={gt}
            stroke="rgba(255,255,255,0.45)" strokeWidth={2} strokeLinecap="round" />
        </Svg>

        {/* 스트로우 (좌우 흔들기) */}
        <Animated.View style={{
          position: 'absolute',
          top: gt - 10, left: cx - 3,
          width: 6, height: gb - gt + 16,
          borderRadius: 3, overflow: 'hidden',
          opacity: strawVis,
          transform: [{ translateX: strawX }],
        }}>
          {Array.from({ length: 9 }, (_, i) => (
            <View key={i} style={{
              flex: 1,
              backgroundColor: i % 2 === 0 ? 'rgba(255,168,100,0.94)' : 'rgba(210,55,55,0.72)',
            }} />
          ))}
        </Animated.View>
      </View>

      <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 9, fontWeight: '600', letterSpacing: 1.1, marginTop: 4 }}>
        {lang === 'ko' ? '믹싱 시뮬레이션' : 'MIXING SIMULATION'}
      </Text>
    </View>
  );
}

function RecipeCard({ recipe, lang, expanded, onPress }: {
  recipe: Recipe; lang: 'en' | 'ko'; expanded: boolean; onPress: () => void;
}) {
  const C = useColors();
  const isDark = useIsDark();

  const ingredients = lang === 'ko' ? recipe.ingredientsKo : recipe.ingredients;
  const steps = lang === 'ko' ? recipe.stepsKo : recipe.stepsEn;
  const diffText = lang === 'ko'
    ? (recipe.difficulty === 'Easy' ? '쉬움' : recipe.difficulty === 'Medium' ? '중간' : '어려움')
    : recipe.difficulty;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        marginHorizontal: 16, marginBottom: 10,
        backgroundColor: isDark ? '#161622' : '#f8f6f2',
        borderRadius: 14, overflow: 'hidden',
        borderWidth: 1, borderColor: isDark ? '#1e1e2e' : '#e0dcd4',
      }}
    >
      {/* Coloured left accent */}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: recipe.color }} />

      {/* Header row */}
      <View style={{ paddingLeft: 16, paddingRight: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 5 }}>
            {lang === 'ko' ? recipe.nameKo : recipe.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
            {recipe.abv !== null
              ? <Text style={{ fontSize: 11, color: recipe.color, fontWeight: '600' }}>ABV {recipe.abv}%</Text>
              : <Text style={{ fontSize: 11, color: '#4caf80', fontWeight: '600' }}>{lang === 'ko' ? '논알콜' : 'Non-Alc'}</Text>
            }
            <Text style={{ fontSize: 11, color: C.textDim }}>·</Text>
            <Text style={{ fontSize: 11, color: C.textDim }}>{recipe.prepMins}min</Text>
            <Text style={{ fontSize: 11, color: C.textDim }}>·</Text>
            <Text style={{ fontSize: 11, color: C.textDim }}>{diffText}</Text>
          </View>
          {/* 재료 병 이미지 미리보기 */}
          <View style={{ flexDirection: 'row', gap: -6, marginTop: 8 }}>
            {recipe.ingredients.slice(0, 5).map((ing, i) => {
              const ingName = ing.split(/\s[-–]\s/)[0].trim();
              return (
                <View key={i} style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: isDark ? '#1a1828' : '#f0eee8',
                  borderWidth: 1, borderColor: `${recipe.color}40`,
                  overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ExpoImage
                    source={{ uri: `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(ingName)}-Small.png` }}
                    style={{ width: 22, height: 22 }}
                    contentFit="contain"
                  />
                </View>
              );
            })}
            {recipe.ingredients.length > 5 && (
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: `${recipe.color}22`,
                borderWidth: 1, borderColor: `${recipe.color}40`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 8, color: recipe.color, fontWeight: '700' }}>
                  +{recipe.ingredients.length - 5}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Svg width={16} height={16} viewBox="0 0 16 16" style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}>
          <Path d="M6 3.5 L11.5 8 L6 12.5" stroke={C.textDim} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: isDark ? '#1e1e2e' : '#e8e4de' }}>

          {/* 시뮬레이션 애니메이션 (자동재생·반복) */}
          <RecipeSimAnimation recipe={recipe} lang={lang} />

          {/* 설명 + 재료 + 단계 */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 18, paddingTop: 14 }}>
            <Text style={{ fontSize: 13, color: C.textDim, lineHeight: 19, marginBottom: 16 }}>
              {lang === 'ko' ? recipe.descKo : recipe.descEn}
            </Text>

            {ingredients.map((ing, i) => {
              const ingName = ing.split(/\s[-–]\s/)[0].trim();
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: isDark ? '#1a1828' : '#f0eee8',
                    borderWidth: 1, borderColor: `${recipe.color}30`,
                    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
                    marginRight: 10, flexShrink: 0,
                  }}>
                    <ExpoImage
                      source={{ uri: `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(ingName)}-Small.png` }}
                      style={{ width: 26, height: 26 }}
                      contentFit="contain"
                    />
                  </View>
                  <Text style={{ fontSize: 13, color: isDark ? '#c0c0d0' : '#3a3830', flex: 1 }}>{ing}</Text>
                </View>
              );
            })}

            <View style={{ height: 1, backgroundColor: isDark ? '#1e1e2e' : '#e8e4de', marginVertical: 14 }} />

            {steps.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 10 }}>
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: `${recipe.color}22`, borderWidth: 1, borderColor: `${recipe.color}55`,
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 10, marginTop: 1, flexShrink: 0,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: recipe.color }}>{i + 1}</Text>
                </View>
                <Text style={{ fontSize: 13, color: isDark ? '#c0c0d0' : '#3a3830', flex: 1, lineHeight: 19 }}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function MixScreen() {
  const { lang, addJournalEntry, customRecipes, addCustomRecipe, toggleSavedRecipe, journalEntries, inventoryItems, addInventoryItem } = useAppStore();
  const t                            = TEXTS[lang];
  const C                            = useColors();
  const styles                       = useStyles();
  const { selections, addPart, removeIngredient, clear, iceCount, iceType } = useMixStore();
  const selected = useSelectedIngredients();

  const [simStage, setSimStage]      = useState<SimStage>('select');
  const [filterCat, setFilterCat]    = useState<'all' | RecipeCategory>('all');
  const [expandedId, setExpandedId]  = useState<string | null>(null);
  const [analyzing,  setAnalyzing]   = useState(false);
  const [prediction, setPrediction]  = useState<FlavorP | null>(null);
  const [adjustment, setAdjustment]  = useState<FlavorP>({ sweet:0, sour:0, bitter:0, body:0, aroma:0 });
  const [journalRating, setJournalRating] = useState(5);
  const [savedFlash, setSavedFlash]  = useState(false);
  const [nameModal, setNameModal]        = useState(false);
  const [pendingName, setPendingName]    = useState('');
  const [pendingGlassIce, setPendingGlassIce] = useState<{ glass: GlassType; ice: number } | null>(null);

  // Available ingredients for chips: user's inventory + PANTRY_INGREDIENTS
  const availableIngredients = useMemo<MixIngredient[]>(() => {
    const baseIngredients: MixIngredient[] = inventoryItems.map(item => ({
      id: item.id,
      name: item.brand || item.name,
      nameKo: item.brand || item.name,
      type: 'Base',
      color: item.spiritType === 'whiskey' ? '#d07818' :
             item.spiritType === 'gin' ? '#bce0f0' :
             item.spiritType === 'vodka' ? '#e0f0ff' :
             item.spiritType === 'rum' ? '#ebdca5' :
             item.spiritType === 'tequila' ? '#ebf5db' :
             item.spiritType === 'brandy' ? '#b05810' : '#ffffff',
      baseProfile: item.profile,
      role: 'base',
      abv: item.abv || 40,
      sugar: 1,
      acid: 0,
    }));
    return [...baseIngredients, ...PANTRY_INGREDIENTS];
  }, [inventoryItems]);

  const toggle = (ing: MixIngredient) => {
    const exists = selections.some(x => x.ingredientId === ing.id);
    if (exists) {
      removeIngredient(ing.id);
    } else {
      addPart(ing.id);
    }
  };

  const allRecipes = useMemo(() => [...RECIPES, ...customRecipes], [customRecipes]);
  const filtered = filterCat === 'all' ? allRecipes : allRecipes.filter(r => r.category === filterCat);

  const adjustedProfile = useMemo<FlavorP | null>(() => {
    if (!prediction) return null;
    return {
      sweet:  Math.max(0, Math.min(5, prediction.sweet  + adjustment.sweet)),
      sour:   Math.max(0, Math.min(5, prediction.sour   + adjustment.sour)),
      bitter: Math.max(0, Math.min(5, prediction.bitter + adjustment.bitter)),
      body:   Math.max(0, Math.min(5, prediction.body   + adjustment.body)),
      aroma:  Math.max(0, Math.min(5, prediction.aroma  + adjustment.aroma)),
    };
  }, [prediction, adjustment]);

  const similarDrinks = useMemo(() => {
    if (!adjustedProfile) return [];
    
    // 1. Rated spirits
    const ratedSpirits = inventoryItems
      .filter(item => (item.myRating ?? 0) > 0)
      .map(item => ({
        name: item.brand || item.name,
        nameKo: item.brand || item.name,
        emoji: item.spiritType === 'whiskey' ? '🥃' :
               item.spiritType === 'gin' ? '🍸' :
               item.spiritType === 'vodka' ? '🥛' :
               item.spiritType === 'rum' ? '🍹' : '🍷',
        profile: item.profile
      }));

    // 2. Journal entries
    const journalCand = journalEntries.map(entry => ({
      name: entry.mixName,
      nameKo: entry.mixName,
      emoji: '🍹',
      profile: entry.profile
    }));

    // Combine unique candidates
    const seen = new Set<string>();
    const candidates: PastDrink[] = [];
    const addCandidates = (list: PastDrink[]) => {
      list.forEach(c => {
        if (!seen.has(c.name.toLowerCase())) {
          seen.add(c.name.toLowerCase());
          candidates.push(c);
        }
      });
    };

    addCandidates(ratedSpirits);
    addCandidates(journalCand);
    addCandidates(PAST_DRINKS_DB);

    return candidates
      .map(drink => ({ drink, score: calcFlavorSim(adjustedProfile, drink.profile) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [adjustedProfile, inventoryItems, journalEntries]);

  // Volume weight and dilution prediction engine
  const handleAnalyze = () => {
    if (selected.length === 0) return;
    setAnalyzing(true);
    setPrediction(null);
    setAdjustment({ sweet:0, sour:0, bitter:0, body:0, aroma:0 });
    
    setTimeout(() => {
      let totalParts = 0;
      let sumSweet = 0;
      let sumSour = 0;
      let sumBitter = 0;
      let sumBody = 0;
      let sumAroma = 0;

      selections.forEach(sel => {
        const ing = selected.find(x => x.id === sel.ingredientId);
        if (ing) {
          totalParts += sel.parts;
          sumSweet += sel.parts * ing.baseProfile.sweet;
          sumSour += sel.parts * ing.baseProfile.sour;
          sumBitter += sel.parts * ing.baseProfile.bitter;
          sumBody += sel.parts * ing.baseProfile.body;
          sumAroma += sel.parts * ing.baseProfile.aroma;
        }
      });

      if (totalParts === 0) {
        setAnalyzing(false);
        return;
      }

      const rawSweet = sumSweet / totalParts;
      const rawSour = sumSour / totalParts;
      const rawBitter = sumBitter / totalParts;
      const rawBody = sumBody / totalParts;
      const rawAroma = sumAroma / totalParts;

      const dilution = 1 / (1 + iceEffCount(iceType, iceCount) * 0.08);

      setPrediction({
        sweet:  Math.min(5, Math.max(0, Math.round(rawSweet  * dilution))),
        sour:   Math.min(5, Math.max(0, Math.round(rawSour   * dilution))),
        bitter: Math.min(5, Math.max(0, Math.round(rawBitter * dilution))),
        body:   Math.min(5, Math.max(0, Math.round(rawBody   * dilution))),
        aroma:  Math.min(5, Math.max(0, Math.round(rawAroma  * dilution))),
      });
      setAnalyzing(false);
    }, 1500);
  };

  const handleSaveToJournal = useCallback(() => {
    if (!adjustedProfile) return;
    const entry: JournalEntry = {
      id: `j${Date.now()}`,
      mixName: selected.map(i => lang === 'ko' ? i.nameKo : i.name).join(' + '),
      ingredients: selected.map(i => lang === 'ko' ? i.nameKo : i.name),
      profile: adjustedProfile,
      tags: genFlavorTags(adjustedProfile, lang),
      rating: journalRating,
      savedAt: new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { year:'numeric', month:'2-digit', day:'2-digit' }),
    };
    addJournalEntry(entry);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }, [adjustedProfile, selected, lang, addJournalEntry, journalRating]);

  const handleSaveRecipe = (glass: GlassType, ice: number) => {
    if (selected.length === 0) return;
    const primaryIng = selected[0];
    const defaultName = lang === 'ko'
      ? `${primaryIng.nameKo} 커스텀 믹스`
      : `${primaryIng.name.split(' ')[0]} Custom Mix`;
    setPendingName(defaultName);
    setPendingGlassIce({ glass, ice });
    setNameModal(true);
  };

  const doSaveRecipe = (customName: string) => {
    if (!pendingGlassIce || selected.length === 0) return;
    const { glass, ice } = pendingGlassIce;

    let totalParts = 0;
    let sumAbv = 0;
    let sumSweet = 0, sumSour = 0, sumBitter = 0, sumBody = 0, sumAroma = 0;
    selections.forEach(sel => {
      const ing = selected.find(x => x.id === sel.ingredientId);
      if (ing) {
        totalParts += sel.parts;
        sumAbv   += sel.parts * ing.abv;
        sumSweet  += sel.parts * ing.baseProfile.sweet;
        sumSour   += sel.parts * ing.baseProfile.sour;
        sumBitter += sel.parts * ing.baseProfile.bitter;
        sumBody   += sel.parts * ing.baseProfile.body;
        sumAroma  += sel.parts * ing.baseProfile.aroma;
      }
    });
    const rawAbv = totalParts > 0 ? sumAbv / totalParts : 0;
    const finalAbv = rawAbv / (1 + ice * 0.08);
    const profile: FlavorP = totalParts > 0 ? {
      sweet:  Math.round(sumSweet  / totalParts),
      sour:   Math.round(sumSour   / totalParts),
      bitter: Math.round(sumBitter / totalParts),
      body:   Math.round(sumBody   / totalParts),
      aroma:  Math.round(sumAroma  / totalParts),
    } : { sweet: 2, sour: 2, bitter: 2, body: 2, aroma: 2 };

    const id = `custom_${Date.now()}`;
    const primaryIng = selected[0];

    const ingListEn = selections.map(sel => {
      const ing = selected.find(x => x.id === sel.ingredientId);
      return ing ? `${ing.name} (${sel.parts} Parts)` : '';
    }).filter(Boolean);
    const ingListKo = selections.map(sel => {
      const ing = selected.find(x => x.id === sel.ingredientId);
      return ing ? `${ing.nameKo} (${sel.parts} Parts)` : '';
    }).filter(Boolean);

    const stepsEn = [
      `Choose a ${glass} glass.`,
      ice > 0 ? 'Add ice to the glass.' : 'Prepare the glass without ice.',
      ...selections.map(sel => {
        const ing = selected.find(x => x.id === sel.ingredientId);
        return `Pour ${sel.parts} Part(s) of ${ing ? ing.name : ''}.`;
      }),
      'Stir well to mix the ingredients.',
      'Garnish and serve!',
    ];
    const stepsKo = [
      `${glass === 'rocks' ? '온더락' : glass === 'highball' ? '하이볼' : glass === 'martini' ? '마티니' : '샷'} 잔을 준비합니다.`,
      ice > 0 ? '잔에 얼음을 추가합니다.' : '얼음 없이 잔을 준비합니다.',
      ...selections.map(sel => {
        const ing = selected.find(x => x.id === sel.ingredientId);
        return `${ing ? ing.nameKo : ''} ${sel.parts} Parts를 잔에 따릅니다.`;
      }),
      '재료가 잘 섞이도록 저어줍니다.',
      '맛있게 즐기세요!',
    ];

    const newRecipe: Recipe = {
      id,
      name: customName,
      nameKo: customName,
      category: 'cocktail',
      difficulty: 'Easy',
      prepMins: 3,
      abv: Math.round(finalAbv),
      descEn: 'A custom creation mixed in My Bar.',
      descKo: '마이 바에서 직접 만든 커스텀 레시피입니다.',
      ingredients: ingListEn,
      ingredientsKo: ingListKo,
      stepsEn,
      stepsKo,
      color: primaryIng ? primaryIng.color : '#8060ff',
    };

    addCustomRecipe(newRecipe);
    toggleSavedRecipe(id);

    // 보관함 저장 → 홈 선반 자동 배치
    addInventoryItem({
      id:          `inv_${id}`,
      name:        customName,
      apiName:     customName,
      spiritType:  'other',
      brand:       customName,
      abv:         Math.round(finalAbv),
      quantity:    'full',
      profile,
      desc: {
        en: 'A custom cocktail created in My Bar.',
        ko: '마이 바에서 직접 만든 커스텀 칵테일입니다.',
      },
    });

    setNameModal(false);
    Alert.alert(
      lang === 'ko' ? '레시피 저장됨' : 'Recipe Saved',
      lang === 'ko' ? `"${customName}"이(가) 보관함과 MY BAR 선반에 저장되었습니다!` : `"${customName}" saved to Archive and MY BAR shelf!`
    );
  };

  const isDark = useIsDark();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>

        {/* ── 시뮬레이션 히어로 ── */}
        <MixSimulator selected={selected} lang={lang} onReset={clear} onStageChange={setSimStage} onSaveRecipe={handleSaveRecipe} />

        {/* 재료 선택 칩 — mix/serve 단계에서 숨김 */}
        {(simStage !== 'mix' && simStage !== 'serve') && (
          <View style={[styles.chipRow, { paddingHorizontal: 20, marginTop: 20 }]}>
            {availableIngredients.map((ing) => {
              const on = selected.some((i) => i.id === ing.id);
              return (
                <TouchableOpacity key={ing.id}
                  style={[styles.chip, on && styles.chipOn, on && { borderColor: ing.color, shadowColor: ing.color }]}
                  onPress={() => toggle(ing)}
                >
                  {on && <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: ing.color, marginRight: 6 }} />}
                  <Text style={[styles.chipTxt, on && { color: ing.color, fontWeight: '700' }]}>
                    {lang === 'ko' ? ing.nameKo : ing.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* AI 분석 버튼 + 결과 */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <TouchableOpacity
            style={[styles.analyzeBtn, (selected.length === 0 || simStage !== 'serve') && { opacity: 0.42 }]}
            onPress={handleAnalyze}
            disabled={selected.length === 0 || analyzing || simStage !== 'serve'}
          >
            <Text style={styles.analyzeTxt}>{analyzing ? t.analyzing : t.analyzeBtn}</Text>
          </TouchableOpacity>
          {adjustedProfile != null && (
            <View style={[styles.resultBox, { marginTop: 20 }]}>
              <View style={styles.aiBadge}><Text style={styles.aiBadgeTxt}>{t.aiPred}</Text></View>
              <RadarChart profile={adjustedProfile} labels={t.radarLabels} size={210} />

              {/* Dynamic flavor tags */}
              <View style={styles.tagsRow}>
                {genFlavorTags(adjustedProfile, lang).map((tg) => (
                  <Text key={tg} style={styles.flavorTag}>{tg}</Text>
                ))}
              </View>

              {/* Tasting Note */}
              <View style={{ marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', width: '100%' }}>
                <Text style={{ fontSize: 13, color: C.text, fontStyle: 'italic', lineHeight: 18, textAlign: 'center' }}>
                  "{generateTastingNote(adjustedProfile, lang)}"
                </Text>
              </View>

              {/* ── Ratio Adjustment ── */}
              <View style={{ width: '100%', marginTop: 18 }}>
                <Text style={[styles.simTitle, { marginBottom: 10 }]}>
                  {lang === 'ko' ? '프로필 조정' : 'ADJUST PROFILE'}
                </Text>
                {(Object.keys(DIM_LABELS) as (keyof FlavorP)[]).map(dim => {
                  const val = adjustedProfile[dim];
                  return (
                    <View key={dim} style={styles.adjustDimRow}>
                      <Text style={styles.adjustLabel}>
                        {lang === 'ko' ? DIM_LABELS[dim].ko : DIM_LABELS[dim].en}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setAdjustment(prev => ({ ...prev, [dim]: Math.max(-5, prev[dim] - 1) }))}
                        style={styles.adjustBtn}
                      >
                        <Text style={[styles.adjustBtnTxt, { color: C.textDim }]}>−</Text>
                      </TouchableOpacity>
                      <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                        {[1,2,3,4,5].map(i => (
                          <View key={i} style={[styles.adjustDot, { backgroundColor: i <= val ? C.primary : C.surfaceHi }]} />
                        ))}
                      </View>
                      <TouchableOpacity
                        onPress={() => setAdjustment(prev => ({ ...prev, [dim]: Math.min(5, prev[dim] + 1) }))}
                        style={styles.adjustBtn}
                      >
                        <Text style={[styles.adjustBtnTxt, { color: C.primary }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
                <TouchableOpacity
                  onPress={() => setAdjustment({ sweet:0, sour:0, bitter:0, body:0, aroma:0 })}
                  style={{ alignSelf: 'flex-end', marginTop: 2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.border }}
                >
                  <Text style={{ fontSize: 11, color: C.textDim, fontWeight: '600' }}>
                    {lang === 'ko' ? '초기화' : 'Reset'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── Multi-drink Similarity ── */}
              <View style={{ width: '100%', marginTop: 16 }}>
                <Text style={[styles.simTitle, { marginBottom: 8 }]}>
                  {lang === 'ko' ? '취향 유사도' : 'TASTE SIMILARITY'}
                </Text>
                {similarDrinks.map(({ drink, score }) => (
                  <View key={drink.name} style={styles.simMultiCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 22 }}>{drink.emoji}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, flex: 1 }}>
                        {lang === 'ko' ? drink.nameKo : drink.name}
                      </Text>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: C.secondary }}>{score}%</Text>
                    </View>
                    <View style={styles.simMultiBar}>
                      <View style={[styles.simMultiFill, { width: `${score}%` as any }]} />
                    </View>
                  </View>
                ))}
              </View>

              {/* Star Rating Selector */}
              <View style={{ width: '100%', marginTop: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: C.textDim, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                  {lang === 'ko' ? '나의 저널 평점' : 'My Journal Rating'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setJournalRating(star)}>
                      <Text style={{ fontSize: 26, color: star <= journalRating ? '#ffc107' : C.surfaceHi }}>
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Save to journal */}
              <TouchableOpacity
                style={[styles.saveBtn, { marginTop: 12, backgroundColor: savedFlash ? C.primary : C.text }]}
                onPress={handleSaveToJournal}
                disabled={savedFlash}
              >
                <Text style={[styles.saveBtnTxt, { color: savedFlash ? '#fff' : C.bg }]}>
                  {savedFlash ? (lang === 'ko' ? '✓ 저장됨' : '✓ Saved') : t.saveToJournal}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── 레시피 섹션 (하단) ── */}
        <View style={{
          marginTop: 36,
          borderTopWidth: 1,
          borderTopColor: isDark ? '#1e1e2e' : '#dedad2',
          paddingTop: 20,
        }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {RECIPE_CATS.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catChip, filterCat === cat.id && styles.catChipOn]}
                onPress={() => { setFilterCat(cat.id); setExpandedId(null); }}
              >
                <Text style={[styles.catChipTxt, filterCat === cat.id && styles.catChipTxtOn]}>
                  {lang === 'ko' ? cat.labelKo : cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ height: 16 }} />

          {filtered.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              lang={lang}
              expanded={expandedId === recipe.id}
              onPress={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}
            />
          ))}
        </View>

      </ScrollView>

      {/* 칵테일 이름 입력 모달 */}
      <Modal visible={nameModal} transparent animationType="fade" onRequestClose={() => setNameModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
          <View style={{ width: '100%', backgroundColor: '#1a1828', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 6, textAlign: 'center' }}>
              {lang === 'ko' ? '칵테일 이름' : 'Cocktail Name'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center', marginBottom: 18 }}>
              {lang === 'ko' ? '나만의 칵테일 이름을 지어주세요' : 'Give your cocktail a name'}
            </Text>
            <TextInput
              value={pendingName}
              onChangeText={setPendingName}
              placeholder={lang === 'ko' ? '예) 블루 문라이트' : 'e.g. Blue Moonlight'}
              placeholderTextColor="rgba(255,255,255,0.25)"
              style={{
                backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
                color: '#fff', fontSize: 15, paddingHorizontal: 14, paddingVertical: 12,
                marginBottom: 20,
              }}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => { if (pendingName.trim()) doSaveRecipe(pendingName.trim()); }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setNameModal(false)}
                style={{ flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center' }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '600' }}>
                  {lang === 'ko' ? '취소' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { if (pendingName.trim()) doSaveRecipe(pendingName.trim()); }}
                style={{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: 'rgba(168,240,192,0.15)', borderWidth: 1, borderColor: 'rgba(168,240,192,0.45)', alignItems: 'center' }}
              >
                <Text style={{ color: '#a8f0c0', fontSize: 14, fontWeight: '800' }}>
                  {lang === 'ko' ? '저장' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────
// EXPLORE SCREEN
// ─────────────────────────────────────────────────────────────────

interface SpiritRecord {
  rating: number;
  noteEn: string;
  noteKo: string;
  profile: { sweet: number; sour: number; bitter: number; body: number; aroma: number };
}

interface BarPost {
  id: string;
  userName: string; userNameKo: string;
  initials: string; c1: string; c2: string;
  followers: string;
  barName: string; barNameKo: string;
  shelf0: string[];
  shelf1: string[];
  likes: number;
  cardH: number;
  neonColor: string;
  wallThemeId: WallThemeId;
  lightColor: string;
  shelfThemeId:   ShelfThemeId;
  counterThemeId: CounterThemeId;
  playerStyleId:  PlayerStyleId;
  playerColorId:  PlayerColorId;
  bgmUrl: string;
  spiritRecords?: Record<string, SpiritRecord>;
}

const BAR_POSTS: BarPost[] = [
  { id:'bp1', userName:'Ayoung Kim', userNameKo:'김아영', initials:'AK', c1:'#ff9a9e', c2:'#f67280', followers:'13K',
    barName:'Summer Vibes', barNameKo:'여름 바',
    shelf0:['Gin','Vodka','Light rum'], shelf1:['Campari','Amaretto'],
    likes:342, cardH:275, neonColor:'#00e0ff', wallThemeId:'slate', lightColor:'#60d0ff',
    shelfThemeId:'maple', counterThemeId:'slate', playerStyleId:'cd', playerColorId:'classic',
    bgmUrl: 'https://knkx-live-a.edge.audiocdn.com/6285_128k',
    spiritRecords: {
      Gin:          { rating:5, noteEn:'Crisp and floral, perfect for summer evenings.',     noteKo:'꽃향기가 나고 상쾌해요. 여름 저녁엔 이게 최고예요.',   profile:{sweet:2,sour:1,bitter:1,body:2,aroma:5} },
      Vodka:        { rating:3, noteEn:'Clean and neutral. A reliable base spirit.',         noteKo:'깔끔하고 무난해요. 어떤 칵테일에도 잘 맞아요.',        profile:{sweet:1,sour:0,bitter:1,body:2,aroma:1} },
      'Light rum':  { rating:5, noteEn:'Light and tropical. Perfect for summer sips.',       noteKo:'가볍고 트로피칼해요. 여름 드링크에 딱 맞아요.',         profile:{sweet:3,sour:1,bitter:1,body:2,aroma:3} },
      Campari:      { rating:4, noteEn:'Bitter and complex. Transforms any cocktail.',       noteKo:'쓴맛이 강하지만 칵테일에 넣으면 깊어져요.',            profile:{sweet:1,sour:1,bitter:5,body:3,aroma:4} },
      Amaretto:     { rating:5, noteEn:'Sweet almond heaven. My absolute favourite.',        noteKo:'달콤한 아몬드 천국. 저의 최애 주류예요.',              profile:{sweet:5,sour:0,bitter:1,body:3,aroma:5} },
    } },
  { id:'bp2', userName:'Jisoo Park', userNameKo:'박지수', initials:'JP', c1:'#a18cd1', c2:'#7c4dff', followers:'8.2K',
    barName:'Whisky Shelf', barNameKo:'위스키 셸프',
    shelf0:['Japanese Whisky','Irish whiskey','Bourbon'], shelf1:['Scotch','Cognac'],
    likes:189, cardH:205, neonColor:'#9060ff', wallThemeId:'wood', lightColor:'#ffd060',
    shelfThemeId:'walnut', counterThemeId:'marble', playerStyleId:'cassette', playerColorId:'wood',
    bgmUrl: 'https://streaming.live365.com/b05055_128mp3',
    spiritRecords: {
      'Japanese Whisky': { rating:5, noteEn:'Delicate and precise. The art of Japanese craftsmanship.', noteKo:'섬세하고 정밀해요. 일본 장인 정신의 예술이에요.', profile:{sweet:4,sour:0,bitter:2,body:4,aroma:5} },
      'Irish whiskey':   { rating:4, noteEn:'Smooth and approachable. Triple distilled perfection.',     noteKo:'부드럽고 접근하기 쉬워요. 3번 증류된 완벽함이에요.',  profile:{sweet:3,sour:1,bitter:1,body:3,aroma:3} },
      Bourbon:           { rating:5, noteEn:'Rich caramel and vanilla. Deeply comforting.',              noteKo:'카라멜과 바닐라가 가득해요. 마음이 따뜻해지는 맛.', profile:{sweet:4,sour:0,bitter:2,body:5,aroma:4} },
      Scotch:            { rating:5, noteEn:'Smoky and complex. Every sip tells a story.',              noteKo:'스모키한 깊이감. 한 모금이 하나의 이야기예요.',      profile:{sweet:2,sour:0,bitter:3,body:4,aroma:5} },
      Cognac:            { rating:4, noteEn:'Elegant and velvety. Best enjoyed after dinner.',           noteKo:'우아하고 벨벳같은 질감. 디저트 후에 딱이에요.',    profile:{sweet:3,sour:1,bitter:1,body:4,aroma:5} },
    } },
  { id:'bp3', userName:'Minho Lee', userNameKo:'이민호', initials:'ML', c1:'#43c6ac', c2:'#1976d2', followers:'21K',
    barName:'Tropical Corner', barNameKo:'트로피칼',
    shelf0:['Light rum','Dark rum','Tequila','Mezcal'], shelf1:['Vodka','Campari'],
    likes:567, cardH:205, neonColor:'#00e880', wallThemeId:'forest', lightColor:'#60ff90',
    shelfThemeId:'cherry', counterThemeId:'wood', playerStyleId:'radio', playerColorId:'black',
    bgmUrl: 'http://ais-sa2.wdc01.cdnstream.com:80/1992_128.mp3',
    spiritRecords: {
      'Light rum': { rating:5, noteEn:'Tropical vibes in every sip. Absolutely love it.', noteKo:'한 모금에 트로피칼이 느껴져요. 정말 최애!',      profile:{sweet:3,sour:1,bitter:1,body:2,aroma:4} },
      'Dark rum':  { rating:5, noteEn:'Rich and molasses-heavy. Complex depth in every sip.', noteKo:'묵직하고 당밀향이 강해요. 깊은 복잡함이 있어요.', profile:{sweet:4,sour:1,bitter:2,body:5,aroma:5} },
      Tequila:     { rating:4, noteEn:'Agave freshness under the tropical sun.',          noteKo:'트로피칼 태양 아래 아가베의 신선함이에요.',       profile:{sweet:2,sour:2,bitter:1,body:3,aroma:4} },
      Mezcal:      { rating:4, noteEn:'Smoky and earthy. Each sip tells a story of fire.', noteKo:'스모키하고 흙향이 나요. 한 모금이 불의 이야기예요.', profile:{sweet:2,sour:1,bitter:2,body:4,aroma:5} },
      Vodka:       { rating:3, noteEn:'Clean contrast to the tropical chaos.',             noteKo:'트로피칼 혼돈에 깔끔한 대조예요.',                profile:{sweet:1,sour:0,bitter:1,body:2,aroma:1} },
      Campari:     { rating:3, noteEn:'Works well in cocktails, intense on its own.',      noteKo:'칵테일엔 좋은데 단독으론 좀 강해요.',             profile:{sweet:1,sour:1,bitter:5,body:3,aroma:3} },
    } },
  { id:'bp4', userName:'Sooyeon Choi', userNameKo:'최수연', initials:'SC', c1:'#ffb347', c2:'#e64a19', followers:'5.7K',
    barName:'Gin Garden', barNameKo:'진 가든',
    shelf0:['Gin','Absinthe','Campari'], shelf1:['Vodka','Amaretto'],
    likes:98, cardH:275, neonColor:'#ffb830', wallThemeId:'brick', lightColor:'#ff9820',
    shelfThemeId:'oak', counterThemeId:'marble', playerStyleId:'cd', playerColorId:'cream',
    bgmUrl: 'https://knkx-live-a.edge.audiocdn.com/6285_128k',
    spiritRecords: {
      Gin:      { rating:5, noteEn:'Complex botanicals, juniper forward. Pure joy.',     noteKo:'복잡한 보타니컬, 주니퍼가 지배적이에요. 최고!',    profile:{sweet:1,sour:1,bitter:2,body:2,aroma:5} },
      Absinthe: { rating:4, noteEn:'Anise-forward and mystical. The green fairy is real.', noteKo:'아니스향이 강하고 신비로워요. 녹색 요정이 정말 있어요.', profile:{sweet:1,sour:0,bitter:3,body:2,aroma:5} },
      Campari:  { rating:4, noteEn:'Bold bitter aperitif. Wakes up the palate.',         noteKo:'강렬한 쓴맛의 아페리티프. 입맛을 깨워줘요.',       profile:{sweet:1,sour:1,bitter:5,body:3,aroma:4} },
      Vodka:    { rating:2, noteEn:'Not my thing. Lacks character for me.',               noteKo:'제 취향은 아니에요. 개성이 좀 없어서요.',           profile:{sweet:1,sour:0,bitter:1,body:1,aroma:1} },
      Amaretto: { rating:3, noteEn:'Sweetness is nice but can be overwhelming.',          noteKo:'달콤함은 좋은데 지나치면 무거워져요.',              profile:{sweet:5,sour:0,bitter:1,body:3,aroma:4} },
    } },
  { id:'bp5', userName:'Taehyun Yoon', userNameKo:'윤태현', initials:'TY', c1:'#84fab0', c2:'#0f9b58', followers:'32K',
    barName:'Classic Cocktails', barNameKo:'클래식 칵테일',
    shelf0:['Bourbon','Gin','Campari','Cognac'], shelf1:['Scotch','Amaretto'],
    likes:891, cardH:275, neonColor:'#e040fb', wallThemeId:'wood', lightColor:'#ffd060',
    shelfThemeId:'ebony', counterThemeId:'marble', playerStyleId:'cassette', playerColorId:'silver',
    bgmUrl: 'https://streaming.live365.com/b05055_128mp3',
    spiritRecords: {
      Bourbon: { rating:5, noteEn:'The backbone of classic cocktails. Essential.',     noteKo:'클래식 칵테일의 근간이에요. 반드시 있어야 해요.',     profile:{sweet:3,sour:0,bitter:2,body:4,aroma:4} },
      Gin:     { rating:5, noteEn:'Versatile and aromatic. The classic spirit.',       noteKo:'다재다능하고 향긋해요. 진정한 클래식 주류죠.',        profile:{sweet:1,sour:1,bitter:2,body:2,aroma:5} },
      Campari: { rating:5, noteEn:'The soul of a Negroni. Irreplaceable.',             noteKo:'네그로니의 영혼이에요. 대체 불가능해요.',             profile:{sweet:2,sour:1,bitter:5,body:3,aroma:4} },
      Cognac:  { rating:4, noteEn:'Refined fruit and oak. Timeless elegance.',         noteKo:'정제된 과일과 오크향. 시대를 초월한 우아함이에요.',   profile:{sweet:3,sour:1,bitter:1,body:4,aroma:5} },
      Scotch:  { rating:5, noteEn:'Smoky complexity that never gets old.',             noteKo:'스모키한 복잡함은 항상 새로워요.',                   profile:{sweet:2,sour:0,bitter:3,body:4,aroma:5} },
      Amaretto:{ rating:4, noteEn:'Occasional sweetness to soften the classics.',      noteKo:'클래식을 부드럽게 해주는 달콤함이에요.',              profile:{sweet:5,sour:0,bitter:1,body:3,aroma:4} },
    } },
  { id:'bp6', userName:'Jiwon Han', userNameKo:'한지원', initials:'JH', c1:'#f093fb', c2:'#f5576c', followers:'4.1K',
    barName:'Wine Lover', barNameKo:'와인 애호가',
    shelf0:['Cognac','Amaretto','Absinthe'], shelf1:['Campari','Gin'],
    likes:215, cardH:205, neonColor:'#ff4060', wallThemeId:'brick', lightColor:'#ff80c0',
    shelfThemeId:'maple', counterThemeId:'steel', playerStyleId:'radio', playerColorId:'cream',
    bgmUrl: 'http://ais-sa2.wdc01.cdnstream.com:80/1992_128.mp3',
    spiritRecords: {
      Cognac:   { rating:5, noteEn:'Pure luxury in a glass. Sip slowly, savour every drop.', noteKo:'한 잔에 담긴 럭셔리. 천천히 음미해야 해요.',      profile:{sweet:3,sour:1,bitter:1,body:5,aroma:5} },
      Amaretto: { rating:5, noteEn:'Sweet and romantic. My go-to dessert drink.',             noteKo:'달콤하고 로맨틱해요. 디저트 주류로 최고예요.',    profile:{sweet:5,sour:0,bitter:1,body:3,aroma:5} },
      Absinthe: { rating:3, noteEn:'Mysterious and haunting. A dramatic addition.',           noteKo:'신비롭고 매혹적이에요. 드라마틱한 선택이에요.',    profile:{sweet:1,sour:0,bitter:3,body:2,aroma:5} },
      Campari:  { rating:3, noteEn:'Interesting for cocktails but too bitter solo.',          noteKo:'칵테일엔 좋은데 단독으론 너무 써요.',             profile:{sweet:1,sour:1,bitter:5,body:2,aroma:3} },
      Gin:      { rating:4, noteEn:'Floral gins remind me of spring gardens.',               noteKo:'플로럴한 진은 봄 정원을 떠올리게 해요.',          profile:{sweet:2,sour:1,bitter:1,body:2,aroma:5} },
    } },
  { id:'bp7', userName:'Minseok Oh', userNameKo:'오민석', initials:'MO', c1:'#4facfe', c2:'#00f2fe', followers:'17K',
    barName:'Japanese Bar', barNameKo:'일본식 바',
    shelf0:['Japanese Whisky','Scotch','Bourbon','Mezcal'], shelf1:['Cognac','Vodka'],
    likes:443, cardH:205, neonColor:'#00e0ff', wallThemeId:'slate', lightColor:'#60d0ff',
    shelfThemeId:'walnut', counterThemeId:'slate', playerStyleId:'cd', playerColorId:'black',
    bgmUrl: 'https://knkx-live-a.edge.audiocdn.com/6285_128k',
    spiritRecords: {
      'Japanese Whisky': { rating:5, noteEn:'The peat and precision of Japanese craft. Unmatched.', noteKo:'일본 장인 정신의 피트와 정밀함. 타의 추종을 불허해요.', profile:{sweet:4,sour:0,bitter:2,body:4,aroma:5} },
      Scotch:            { rating:5, noteEn:'The soul of Scotland in every drop. Pure refinement.', noteKo:'스코틀랜드의 영혼이 담긴 방울. 최고의 정제미.',       profile:{sweet:2,sour:0,bitter:3,body:4,aroma:5} },
      Bourbon:           { rating:4, noteEn:'Smooth sweetness, great for highball style.',          noteKo:'부드러운 단맛, 하이볼로 마시면 너무 좋아요.',         profile:{sweet:3,sour:0,bitter:2,body:4,aroma:4} },
      Mezcal:            { rating:4, noteEn:'The wild card. Smoky contrast to the refined.',        noteKo:'와일드카드예요. 정제미에 스모키한 대조를 줘요.',        profile:{sweet:2,sour:1,bitter:2,body:4,aroma:5} },
      Cognac:            { rating:4, noteEn:'Sophisticated and warming. After-work luxury.',        noteKo:'세련되고 따뜻해요. 퇴근 후의 소소한 사치예요.',        profile:{sweet:3,sour:1,bitter:1,body:4,aroma:4} },
      Vodka:             { rating:3, noteEn:'Clean and functional. Good base for mixed drinks.',    noteKo:'깔끔하고 실용적이에요. 믹스 드링크 베이스로 좋아요.', profile:{sweet:1,sour:0,bitter:1,body:2,aroma:1} },
    } },
  { id:'bp8', userName:'Yura Song', userNameKo:'송유라', initials:'YS', c1:'#fa709a', c2:'#fee140', followers:'9.8K',
    barName:'Mezcal Nights', barNameKo:'메즈칼 나이트',
    shelf0:['Mezcal','Tequila','Dark rum'], shelf1:['Campari','Absinthe'],
    likes:312, cardH:275, neonColor:'#ffb830', wallThemeId:'forest', lightColor:'#ff9820',
    shelfThemeId:'cherry', counterThemeId:'wood', playerStyleId:'cassette', playerColorId:'silver',
    bgmUrl: 'https://streaming.live365.com/b05055_128mp3',
    spiritRecords: {
      Mezcal:    { rating:5, noteEn:'Smoky soul in a glass. I could drink this forever.',      noteKo:'잔 속의 스모키한 영혼. 평생 마실 수 있어요.',         profile:{sweet:2,sour:1,bitter:2,body:4,aroma:5} },
      Tequila:   { rating:5, noteEn:'Life is too short for bad tequila. This is magic.',       noteKo:'나쁜 테킬라를 마실 시간은 없어요. 이건 마법이에요.',  profile:{sweet:2,sour:2,bitter:1,body:3,aroma:4} },
      'Dark rum': { rating:4, noteEn:'Dark and mysterious. Pairs beautifully with Mezcal.',    noteKo:'어둡고 신비로워요. 메즈칼과 아름답게 어울려요.',       profile:{sweet:4,sour:1,bitter:2,body:5,aroma:5} },
      Campari:   { rating:4, noteEn:'The perfect bitter contrast to smoky cocktails.',         noteKo:'스모키한 칵테일에 완벽한 쓴맛 대조예요.',            profile:{sweet:1,sour:1,bitter:5,body:3,aroma:4} },
      Absinthe:  { rating:4, noteEn:'Green magic and anise. Electrifying combination.',        noteKo:'녹색 마법과 아니스. 전율스러운 조합이에요.',          profile:{sweet:1,sour:0,bitter:3,body:2,aroma:5} },
    } },
  { id:'bp9', userName:'Dohyun Kang', userNameKo:'강도현', initials:'DK', c1:'#e0c3fc', c2:'#8ec5fc', followers:'6.3K',
    barName:'Negroni Club', barNameKo:'네그로니 클럽',
    shelf0:['Campari','Gin','Bourbon'], shelf1:['Scotch','Amaretto'],
    likes:478, cardH:275, neonColor:'#9060ff', wallThemeId:'slate', lightColor:'#c060ff',
    shelfThemeId:'oak', counterThemeId:'marble', playerStyleId:'radio', playerColorId:'wood',
    bgmUrl: 'http://ais-sa2.wdc01.cdnstream.com:80/1992_128.mp3',
    spiritRecords: {
      Campari: { rating:5, noteEn:'The holy trinity of bitters. Central to my life.',  noteKo:'비터즈의 성삼위일체. 제 삶의 중심이에요.',            profile:{sweet:2,sour:1,bitter:5,body:3,aroma:5} },
      Gin:     { rating:5, noteEn:'The perfect Negroni partner. Juniper is key.',      noteKo:'완벽한 네그로니 파트너. 주니퍼가 핵심이에요.',        profile:{sweet:1,sour:1,bitter:2,body:2,aroma:5} },
      Bourbon: { rating:4, noteEn:'Adds warmth and sweetness to the bitter mix.',      noteKo:'쓴맛에 따뜻함과 달콤함을 더해줘요.',                  profile:{sweet:3,sour:0,bitter:2,body:4,aroma:4} },
      Scotch:  { rating:4, noteEn:'Peaty depth complements the Campari wonderfully.',  noteKo:'피티한 깊이가 캄파리와 놀랍도록 잘 어울려요.',        profile:{sweet:2,sour:0,bitter:3,body:4,aroma:5} },
      Amaretto:{ rating:3, noteEn:'Good for an occasional sweet touch.',               noteKo:'가끔 달콤한 터치를 줄 때 좋아요.',                   profile:{sweet:5,sour:0,bitter:1,body:3,aroma:4} },
    } },
  { id:'bp10', userName:'Sohee Lim', userNameKo:'임소희', initials:'SL', c1:'#ffecd2', c2:'#fcb69f', followers:'11K',
    barName:'Aperitivo Hour', barNameKo:'아페리티보',
    shelf0:['Campari','Cognac','Absinthe'], shelf1:['Amaretto','Tequila'],
    likes:203, cardH:205, neonColor:'#ff4060', wallThemeId:'brick', lightColor:'#ffd060',
    shelfThemeId:'ebony', counterThemeId:'steel', playerStyleId:'cd', playerColorId:'silver',
    bgmUrl: 'https://knkx-live-a.edge.audiocdn.com/6285_128k',
    spiritRecords: {
      Campari:  { rating:5, noteEn:'Aperitivo ritual starts with Campari. Always.',    noteKo:'아페리티보는 항상 캄파리로 시작해요. 무조건!',        profile:{sweet:2,sour:1,bitter:5,body:3,aroma:4} },
      Cognac:   { rating:5, noteEn:'Warm and fruity. A digestif dream after dinner.',  noteKo:'따뜻하고 과일향이 나요. 디너 후 디제스티프 최고!',  profile:{sweet:3,sour:1,bitter:1,body:4,aroma:5} },
      Absinthe: { rating:4, noteEn:'Mystical green ritual. Changes the aperitivo mood.', noteKo:'신비로운 녹색 의식. 아페리티보 분위기를 바꿔요.',    profile:{sweet:1,sour:0,bitter:3,body:2,aroma:5} },
      Amaretto: { rating:4, noteEn:'Sweet embrace. Perfect with espresso.',             noteKo:'달콤한 포옹 같아요. 에스프레소와 완벽해요.',         profile:{sweet:5,sour:0,bitter:1,body:3,aroma:5} },
      Tequila:  { rating:3, noteEn:'Fun for parties but not my aperitivo vibe.',       noteKo:'파티엔 좋은데 제 아페리티보 감성이 아니에요.',       profile:{sweet:2,sour:2,bitter:1,body:3,aroma:3} },
    } },
  { id:'bp11', userName:'Junho Bae', userNameKo:'배준호', initials:'JB', c1:'#a1c4fd', c2:'#c2e9fb', followers:'28K',
    barName:'Rum Shelf', barNameKo:'럼 컬렉션',
    shelf0:['Light rum','Dark rum','Mezcal','Tequila'], shelf1:['Vodka','Campari'],
    likes:763, cardH:205, neonColor:'#00e0ff', wallThemeId:'wood', lightColor:'#60d0ff',
    shelfThemeId:'maple', counterThemeId:'wood', playerStyleId:'cassette', playerColorId:'black',
    bgmUrl: 'https://streaming.live365.com/b05055_128mp3',
    spiritRecords: {
      'Light rum': { rating:5, noteEn:'The soul of Caribbean sunshine. Smooth and joyful.',  noteKo:'카리브해 햇살의 영혼이에요. 부드럽고 즐거워요.',      profile:{sweet:3,sour:1,bitter:1,body:2,aroma:3} },
      'Dark rum':  { rating:5, noteEn:'Deep molasses richness. My secret for amazing cocktails.', noteKo:'깊은 당밀 풍미. 놀라운 칵테일의 비밀이에요.',      profile:{sweet:4,sour:1,bitter:2,body:5,aroma:5} },
      Mezcal:      { rating:4, noteEn:'Unexpected guest in my rum bar. Absolutely love it.', noteKo:'럼 바의 뜻밖의 손님. 정말 좋아요.',                  profile:{sweet:2,sour:1,bitter:2,body:4,aroma:5} },
      Tequila:     { rating:4, noteEn:'Agave character shines through beautifully.',         noteKo:'아가베의 캐릭터가 아름답게 드러나요.',               profile:{sweet:2,sour:2,bitter:1,body:3,aroma:4} },
      Vodka:       { rating:3, noteEn:'Clean foundation. Useful when rum is too much.',      noteKo:'깨끗한 기반이에요. 럼이 과할 때 유용해요.',           profile:{sweet:1,sour:0,bitter:1,body:2,aroma:1} },
      Campari:     { rating:3, noteEn:'Strong character but great in moderation.',           noteKo:'개성이 강하지만 적당히 쓰면 훌륭해요.',              profile:{sweet:1,sour:1,bitter:5,body:3,aroma:3} },
    } },
  { id:'bp12', userName:'Eunbi Cho', userNameKo:'조은비', initials:'EC', c1:'#fd7043', c2:'#ff8a65', followers:'3.9K',
    barName:'Mezcal & Fire', barNameKo:'메즈칼 파이어',
    shelf0:['Mezcal','Absinthe','Tequila','Bourbon'], shelf1:['Campari','Dark rum'],
    likes:91, cardH:275, neonColor:'#ff4060', wallThemeId:'forest', lightColor:'#ff9820',
    shelfThemeId:'cherry', counterThemeId:'marble', playerStyleId:'radio', playerColorId:'cream',
    bgmUrl: 'http://ais-sa2.wdc01.cdnstream.com:80/1992_128.mp3',
    spiritRecords: {
      Mezcal:    { rating:5, noteEn:'The fire that lives in smoke. I breathe this.',     noteKo:'연기 속에 사는 불꽃. 이걸 들이마셔요.',              profile:{sweet:2,sour:1,bitter:2,body:4,aroma:5} },
      Absinthe:  { rating:5, noteEn:'Green fire and mystery. Nothing else compares.',     noteKo:'녹색 불꽃과 신비. 다른 건 비교도 안 돼요.',          profile:{sweet:1,sour:0,bitter:3,body:2,aroma:5} },
      Tequila:   { rating:5, noteEn:'The fire that never fades. I live for this.',        noteKo:'절대 사그라들지 않는 불꽃. 이걸 위해 살아요.',       profile:{sweet:2,sour:2,bitter:1,body:4,aroma:4} },
      Bourbon:   { rating:4, noteEn:'Warm fire in a glass. Pairs with everything.',       noteKo:'잔 속의 따뜻한 불꽃. 모든 것과 잘 어울려요.',        profile:{sweet:3,sour:0,bitter:2,body:4,aroma:3} },
      Campari:   { rating:4, noteEn:'Boldly bitter and unapologetic. I respect it.',      noteKo:'당당하게 쓴맛. 그 자신감이 마음에 들어요.',          profile:{sweet:1,sour:1,bitter:5,body:3,aroma:4} },
      'Dark rum': { rating:3, noteEn:'Dark and brooding. Fits the fire theme perfectly.', noteKo:'어둡고 진지해요. 파이어 테마에 딱 맞아요.',           profile:{sweet:4,sour:1,bitter:2,body:5,aroma:4} },
    } },
  { id:'bp13', userName:'Kyungmin Shin', userNameKo:'신경민', initials:'KS', c1:'#667eea', c2:'#764ba2', followers:'19K',
    barName:'Vintage Cellar', barNameKo:'빈티지 셀러',
    shelf0:['Cognac','Scotch','Irish whiskey','Tennessee Whiskey'], shelf1:['Bourbon','Amaretto'],
    likes:534, cardH:275, neonColor:'#9060ff', wallThemeId:'wood', lightColor:'#ffd060',
    shelfThemeId:'walnut', counterThemeId:'slate', playerStyleId:'cd', playerColorId:'wood',
    bgmUrl: 'https://knkx-live-a.edge.audiocdn.com/6285_128k',
    spiritRecords: {
      Cognac:              { rating:5, noteEn:'The pinnacle of distillation. Timeless and noble.',       noteKo:'증류의 정점이에요. 시대를 초월한 고귀함이 있어요.',    profile:{sweet:3,sour:1,bitter:1,body:5,aroma:5} },
      Scotch:              { rating:5, noteEn:'Decades of patience in every drop. Magnificent.',         noteKo:'한 방울에 수십 년의 인내가 담겨 있어요. 경이로워요.', profile:{sweet:2,sour:0,bitter:2,body:4,aroma:5} },
      'Irish whiskey':     { rating:4, noteEn:'Smooth heritage. The underrated classic.',                noteKo:'부드러운 유산. 과소평가된 클래식이에요.',              profile:{sweet:3,sour:1,bitter:1,body:3,aroma:3} },
      'Tennessee Whiskey': { rating:4, noteEn:'Charcoal-filtered smoothness. An American icon.',         noteKo:'숯 필터링된 부드러움. 미국의 아이콘이에요.',           profile:{sweet:3,sour:1,bitter:2,body:3,aroma:3} },
      Bourbon:             { rating:4, noteEn:'American heritage in a glass. Classic choice.',           noteKo:'잔 속의 미국 문화유산이에요. 클래식한 선택.',          profile:{sweet:3,sour:0,bitter:2,body:4,aroma:4} },
      Amaretto:            { rating:3, noteEn:'Sweet nostalgia. Reminds me of old Italian bars.',        noteKo:'달콤한 향수. 옛 이탈리아 바가 떠올라요.',             profile:{sweet:5,sour:0,bitter:1,body:3,aroma:5} },
    } },
  { id:'bp14', userName:'Nayeon Jung', userNameKo:'정나연', initials:'NJ', c1:'#f7971e', c2:'#ffd200', followers:'7.4K',
    barName:'Citrus Lab', barNameKo:'시트러스 랩',
    shelf0:['Gin','Vodka','Tequila','Light rum'], shelf1:['Campari','Cognac'],
    likes:289, cardH:205, neonColor:'#ffb830', wallThemeId:'slate', lightColor:'#60ff90',
    shelfThemeId:'oak', counterThemeId:'steel', playerStyleId:'cassette', playerColorId:'classic',
    bgmUrl: 'https://streaming.live365.com/b05055_128mp3',
    spiritRecords: {
      Gin:         { rating:5, noteEn:'Citrus-forward gins are my obsession. Zesty!',       noteKo:'시트러스 진에 집착해요. 상큼함이 넘쳐요!',             profile:{sweet:1,sour:2,bitter:1,body:2,aroma:5} },
      Vodka:       { rating:4, noteEn:'Clean canvas for citrus experiments.',               noteKo:'시트러스 실험을 위한 깨끗한 캔버스예요.',              profile:{sweet:1,sour:0,bitter:1,body:2,aroma:2} },
      Tequila:     { rating:5, noteEn:'The lime-tequila combo is a match made in heaven.',  noteKo:'라임과 테킬라 조합은 천생연분이에요.',                 profile:{sweet:2,sour:3,bitter:1,body:3,aroma:4} },
      'Light rum': { rating:4, noteEn:'Citrus and rum sing together beautifully.',          noteKo:'시트러스와 럼이 아름답게 어울려요.',                    profile:{sweet:3,sour:1,bitter:1,body:2,aroma:3} },
      Campari:     { rating:4, noteEn:'Bitter citrus hero. Essential for Spritzes.',        noteKo:'쓴맛의 시트러스 영웅이에요. 스프리츠엔 필수예요.',       profile:{sweet:1,sour:1,bitter:5,body:3,aroma:4} },
      Cognac:      { rating:3, noteEn:'Rich and heavy. Sometimes I want something lighter.', noteKo:'묵직하고 진해요. 때론 더 가벼운 걸 원해요.',           profile:{sweet:3,sour:1,bitter:1,body:4,aroma:4} },
    } },
  { id:'bp15', userName:'Woojin Park', userNameKo:'박우진', initials:'WP', c1:'#11998e', c2:'#38ef7d', followers:'14K',
    barName:'Soju Modern', barNameKo:'소주 모던',
    shelf0:['Vodka','Gin','Tennessee Whiskey'], shelf1:['Bourbon','Campari'],
    likes:621, cardH:205, neonColor:'#00e880', wallThemeId:'wood', lightColor:'#60ff90',
    shelfThemeId:'ebony', counterThemeId:'marble', playerStyleId:'radio', playerColorId:'silver',
    bgmUrl: 'http://ais-sa2.wdc01.cdnstream.com:80/1992_128.mp3',
    spiritRecords: {
      Vodka:               { rating:4, noteEn:'Modern and clean. Great for fusion cocktails.',      noteKo:'모던하고 깔끔해요. 퓨전 칵테일에 완벽해요.',         profile:{sweet:1,sour:0,bitter:1,body:2,aroma:2} },
      Gin:                 { rating:4, noteEn:'East-meets-West botanicals. Surprisingly versatile.',noteKo:'동서양의 보타니컬이 만나요. 놀랍도록 다재다능해요.',  profile:{sweet:1,sour:1,bitter:2,body:2,aroma:4} },
      'Tennessee Whiskey': { rating:5, noteEn:'Charcoal smooth. The modern bar staple.',            noteKo:'숯처럼 부드러워요. 현대 바의 필수 주류예요.',         profile:{sweet:3,sour:1,bitter:2,body:3,aroma:3} },
      Bourbon:             { rating:5, noteEn:'The modern interpretation of tradition. Love it.',   noteKo:'전통의 현대적 해석이에요. 너무 좋아요.',             profile:{sweet:4,sour:0,bitter:2,body:4,aroma:4} },
      Campari:             { rating:3, noteEn:'Strong and bold. Useful in small doses.',            noteKo:'강하고 대담해요. 소량만 써도 충분해요.',             profile:{sweet:1,sour:1,bitter:5,body:3,aroma:3} },
    } },
  { id:'bp16', userName:'Hyeri Moon', userNameKo:'문혜리', initials:'HM', c1:'#ee9ca7', c2:'#ffdde1', followers:'5.1K',
    barName:'Rosé All Day', barNameKo:'로제 하루',
    shelf0:['Amaretto','Cognac','Gin'], shelf1:['Dark rum','Campari'],
    likes:157, cardH:275, neonColor:'#e040fb', wallThemeId:'brick', lightColor:'#ff80c0',
    shelfThemeId:'maple', counterThemeId:'wood', playerStyleId:'cd', playerColorId:'cream',
    bgmUrl: 'https://knkx-live-a.edge.audiocdn.com/6285_128k',
    spiritRecords: {
      Amaretto:  { rating:5, noteEn:'Sweet and dreamy. Like love in liquid form.',      noteKo:'달콤하고 몽환적이에요. 액체 형태의 사랑 같아요.',        profile:{sweet:5,sour:0,bitter:1,body:3,aroma:5} },
      Cognac:    { rating:5, noteEn:'Romantic and warm. Perfect for quiet evenings.',   noteKo:'로맨틱하고 따뜻해요. 조용한 저녁에 딱이에요.',          profile:{sweet:3,sour:1,bitter:1,body:4,aroma:5} },
      Gin:       { rating:4, noteEn:'Floral notes remind me of fresh roses.',           noteKo:'플로럴한 향이 신선한 장미를 떠올리게 해요.',            profile:{sweet:2,sour:1,bitter:1,body:2,aroma:5} },
      'Dark rum': { rating:3, noteEn:'Dark and velvety. A dramatic touch to my rosé world.', noteKo:'어둡고 벨벳같아요. 제 로제 세계에 드라마틱한 터치예요.', profile:{sweet:4,sour:1,bitter:2,body:5,aroma:4} },
      Campari:   { rating:3, noteEn:'A dramatic bitter contrast to my sweet world.',    noteKo:'제 달콤한 세계에 드라마틱한 쓴맛 대조예요.',           profile:{sweet:1,sour:1,bitter:4,body:3,aroma:3} },
    } },
];

// ─────────────────────────────────────────────────────────────────
// VISITOR BAR MODAL — shows another user's bar in My-Bar style
// ─────────────────────────────────────────────────────────────────
function VisitorBarWall({ barName, neonColor, wallThemeId }: {
  barName: string; neonColor: string; wallThemeId: WallThemeId;
}) {
  const C      = useColors();
  const styles = useStyles();
  const isDark = useIsDark();
  const wallTheme = BAR_WALL_THEMES.find(t => t.id === wallThemeId) ?? BAR_WALL_THEMES[0];
  const wallBg    = isDark ? wallTheme.darkBg : wallTheme.lightBg;
  const signColor = isDark ? neonColor : C.accent;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: wallBg }]} pointerEvents="none">
      <View style={[styles.grainLine, { top: '14%' }]} />
      <View style={[styles.grainLine, { top: '38%' }]} />
      <View style={[styles.grainLine, { top: '62%' }]} />
      <View style={styles.signArea}>
        <View style={styles.signFrame}>
          <View style={[styles.signRule, { borderColor: `${signColor}45` }]} />
          <View style={{ height: 12 }} />
          <NeonText text={barName} color={signColor} size={48} script />
          <Text style={[styles.signEst, { color: `${signColor}70` }]}>EST. 2025</Text>
          <View style={{ height: 12 }} />
          <View style={[styles.signRule, { borderColor: `${signColor}38` }]} />
        </View>
      </View>
    </View>
  );
}

function VisitorPendantLights({ cabH, lightColor }: { cabH: number; lightColor: string }) {
  const isDark = useIsDark();
  if (cabH === 0) return null;
  const lc       = lightColor;
  const shelfW   = SCREEN_W - SHELF_MX * 2;
  const planks   = SHELF_FRACS.map(f => Math.round(cabH * f));
  const pxLeft   = SHELF_MX + Math.round(shelfW * 0.28);
  const pxRight  = SHELF_MX + Math.round(shelfW * 0.72);
  const bulbBg   = isDark ? '#fff8d0' : '#e0d9c4';
  const cordClr  = isDark ? 'rgba(140,120,80,0.50)' : 'rgba(100,90,70,0.40)';
  return (
    <>
      {planks.map((plankY, si) => {
        const bulbY  = plankY - BOTTLE_H - 16;
        const coneH  = BOTTLE_H + 16;
        const coneHW = Math.round(shelfW * 0.32);
        return [pxLeft, pxRight].map((px, pi) => {
          const id = `vcone_${si}_${pi}`;
          return (
            <React.Fragment key={id}>
              <View style={{ position: 'absolute', top: 0, left: px - 1, width: 2, height: bulbY + 6, backgroundColor: cordClr }} pointerEvents="none" />
              {isDark && (
                <Svg width={coneHW * 2} height={coneH} style={{ position: 'absolute', top: bulbY + 2, left: px - coneHW }} pointerEvents="none">
                  <Defs>
                    <RadialGradient id={id} cx={coneHW} cy={0} r={coneH} fx={coneHW} fy={0} gradientUnits="userSpaceOnUse">
                      <Stop offset="0"    stopColor={lc} stopOpacity={0.30} />
                      <Stop offset="0.35" stopColor={lc} stopOpacity={0.12} />
                      <Stop offset="0.70" stopColor={lc} stopOpacity={0.04} />
                      <Stop offset="1"    stopColor={lc} stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Ellipse cx={coneHW} cy={0} rx={coneHW} ry={coneH} fill={`url(#${id})`} />
                </Svg>
              )}
              <View style={{ position: 'absolute', top: bulbY - 5, left: px - 9, width: 18, height: 18, borderRadius: 9, backgroundColor: bulbBg, shadowColor: isDark ? lc : 'transparent', shadowRadius: 22, shadowOpacity: isDark ? 0.55 : 0, shadowOffset: { width: 0, height: 4 } }} pointerEvents="none" />
              <View style={{ position: 'absolute', top: bulbY - 1, left: px - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: isDark ? '#ffffff' : '#bfb89e', shadowColor: isDark ? '#ffffff' : 'transparent', shadowRadius: 6, shadowOpacity: isDark ? 0.50 : 0, shadowOffset: { width: 0, height: 0 } }} pointerEvents="none" />
            </React.Fragment>
          );
        });
      })}
    </>
  );
}

function VisitorBottlePanel({ name, post, onClose }: { name: string; post: BarPost; onClose: () => void }) {
  const C    = useColors();
  const { lang, savedSpiritIds, toggleSavedSpirit } = useAppStore();
  const t    = TEXTS[lang];

  const ownerRecord = post.spiritRecords?.[name];
  const matchSpirit = SEARCH_SPIRITS.find(s => s.apiName === name || s.name === name);
  const isSaved     = matchSpirit ? savedSpiritIds.includes(matchSpirit.id) : false;

  return (
    <View style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: C.bg,
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      borderTopWidth: 1, borderColor: C.border,
      paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28,
    }}>
      <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 14 }} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <View style={{ width: 58, height: 78, backgroundColor: C.surfaceHi, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
          <ExpoImage
            source={{ uri: `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(name)}-Medium.png` }}
            style={{ width: 46, height: 68 }}
            contentFit="contain"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>{name}</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', marginTop: 3,
            color: ownerRecord ? C.primary : C.textDim }}>
            {ownerRecord
              ? (lang === 'ko' ? `${post.userNameKo}의 기록` : `${post.userName}'s record`)
              : (lang === 'ko' ? '기록 없음' : 'No record')}
          </Text>
        </View>
        {/* Scrap/save button */}
        {matchSpirit && (
          <TouchableOpacity
            onPress={() => toggleSavedSpirit(matchSpirit.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              backgroundColor: isSaved ? C.primary : C.surfaceHi,
              borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
              borderWidth: 1, borderColor: isSaved ? C.primary : C.border,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: isSaved ? C.bg : C.textDim }}>
              {isSaved ? (lang === 'ko' ? '저장됨' : 'Saved') : (lang === 'ko' ? '저장' : 'Save')}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
          <Text style={{ fontSize: 16, color: C.textDim }}>✕</Text>
        </TouchableOpacity>
      </View>

      {ownerRecord ? (
        <>
          {/* 평점 */}
          <Text style={{ fontSize: 10, fontWeight: '800', color: C.textDim, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
            {lang === 'ko' ? '평점' : 'RATING'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
            {[1,2,3,4,5].map(i => (
              <Text key={i} style={{ fontSize: 24, color: i <= ownerRecord.rating ? C.accent : C.border }}>★</Text>
            ))}
            <Text style={{ fontSize: 12, color: C.textDim, marginLeft: 6, fontWeight: '600' }}>{ownerRecord.rating}.0 / 5</Text>
          </View>

          {/* 기록 */}
          {(lang === 'ko' ? ownerRecord.noteKo : ownerRecord.noteEn) ? (
            <View style={{ backgroundColor: C.surfaceHi, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.primary, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
                {t.myNotes}
              </Text>
              <Text style={{ fontSize: 13, color: C.text, lineHeight: 20, fontStyle: 'italic' }}>
                {lang === 'ko' ? ownerRecord.noteKo : ownerRecord.noteEn}
              </Text>
            </View>
          ) : null}

          {/* 풍미 프로필 */}
          <Text style={{ fontSize: 10, fontWeight: '800', color: C.textDim, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
            {t.flavorProfile}
          </Text>
          <RadarChart profile={ownerRecord.profile} labels={t.radarLabels} size={160} />
        </>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontSize: 36, marginBottom: 10 }}>🍶</Text>
          <Text style={{ fontSize: 13, color: C.textDim, textAlign: 'center', lineHeight: 20 }}>
            {lang === 'ko'
              ? `${post.userNameKo}이(가) 아직 기록하지 않은 주류예요.`
              : `${post.userName} hasn't recorded this spirit yet.`}
          </Text>
        </View>
      )}
    </View>
  );
}

function VisitorWallPlayer({ playerStyleId, playerColorId, isPlaying }: { playerStyleId: PlayerStyleId; playerColorId: PlayerColorId; isPlaying?: boolean }) {
  const isDark = useIsDark();
  const pc = BAR_PLAYER_COLORS.find(c => c.id === playerColorId) ?? BAR_PLAYER_COLORS[0];
  const bodyFill   = isDark ? pc.dark : pc.light;
  const bodyStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)';
  const BW = 60, BH = 60, CX = 30, CY = 30;
  const indicatorColor = isPlaying ? '#00e0ff' : (isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.22)');

  if (playerStyleId === 'cd') {
    const CR = 21, CDR = CR - 1;
    const dotFill = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)';
    return (
      <Svg width={BW} height={BH}>
        <SvgRect x={0} y={0} width={BW} height={BH} rx={10} fill={bodyFill} />
        <SvgRect x={0} y={0} width={BW} height={BH} rx={10} fill="none" stroke={bodyStroke} strokeWidth="1" />
        <Circle cx={CX} cy={CY} r={CR + 2} fill={isDark ? '#1a1a26' : '#e0ddd8'} />
        {[-10,-5,0,5,10].map(dy => <Circle key={`l${dy}`} cx={7}     cy={CY+dy} r={1.1} fill={dotFill} />)}
        {[-10,-5,0,5,10].map(dy => <Circle key={`r${dy}`} cx={BW-7}  cy={CY+dy} r={1.1} fill={dotFill} />)}
        <Circle cx={CX} cy={CY} r={CDR}     fill="#1a0802" />
        <Circle cx={CX} cy={CY} r={CDR-3}   fill="#b04018" />
        <Circle cx={CX} cy={CY} r={CDR-9}   fill="#e49030" />
        <Circle cx={CX} cy={CY} r={CDR-13}  fill="#f8c040" />
        <Circle cx={CX} cy={CY} r={7}        fill="#f0a820" />
        <Circle cx={CX} cy={CY} r={2.5}      fill="#111" />
        <Circle cx={CX} cy={CY} r={CR} fill="rgba(255,255,255,0.04)" />
        <Circle cx={CX} cy={CY} r={CR} fill="none" stroke={isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'} strokeWidth="1.2" />
        <Circle cx={BW-7} cy={7} r={3} fill={indicatorColor} />
      </Svg>
    );
  }
  if (playerStyleId === 'cassette') {
    const WX=10,WY=12,WW=40,WH=22, R1X=WX+10,R2X=WX+WW-10,RY=WY+WH/2,RR=7;
    return (
      <Svg width={BW} height={BH}>
        <SvgRect x={0} y={0} width={BW} height={BH} rx={8} fill={bodyFill} />
        <SvgRect x={0} y={0} width={BW} height={BH} rx={8} fill="none" stroke={bodyStroke} strokeWidth="1" />
        <SvgRect x={WX} y={WY} width={WW} height={WH} rx={4} fill={isDark ? '#0e0e18' : '#d0ccc8'} />
        <Line x1={R1X+RR} y1={RY} x2={R2X-RR} y2={RY} stroke={isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.15)'} strokeWidth="1.2" />
        {[R1X,R2X].map((rx,i) => (
          <React.Fragment key={i}>
            <Circle cx={rx} cy={RY} r={RR}   fill={isDark ? '#1e1a10' : '#b0a890'} />
            <Circle cx={rx} cy={RY} r={RR-2} fill={isDark ? '#2a2418' : '#c8c0a8'} />
            <Circle cx={rx} cy={RY} r={3}    fill={isDark ? '#444' : '#888'} />
          </React.Fragment>
        ))}
        {[14,24,34,44].map((bx,i) => <SvgRect key={i} x={bx-4} y={BH-12} width={8} height={6} rx={2} fill={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)'} />)}
        <Circle cx={BW-8} cy={8} r={2.5} fill={indicatorColor} />
      </Svg>
    );
  }
  // radio
  const KW=42, KH=26, KX=(BW-KW)/2, KY=10;
  return (
    <Svg width={BW} height={BH}>
      <SvgRect x={0} y={0} width={BW} height={BH} rx={9} fill={bodyFill} />
      <SvgRect x={0} y={0} width={BW} height={BH} rx={9} fill="none" stroke={bodyStroke} strokeWidth="1" />
      <SvgRect x={KX} y={KY} width={KW} height={KH} rx={3} fill={isDark ? '#0a0a14' : '#c8c4bc'} />
      {[0.25,0.5,0.75].map((f,i) => <Line key={i} x1={KX+KW*f} y1={KY+4} x2={KX+KW*f} y2={KY+KH-4} stroke={isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.16)'} strokeWidth="0.8" />)}
      <Circle cx={BW/2} cy={BH-14} r={8} fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'} />
      <Circle cx={BW/2} cy={BH-14} r={3} fill={isDark ? '#555' : '#888'} />
      <Circle cx={BW-10} cy={8}    r={2.5} fill={indicatorColor} />
    </Svg>
  );
}

function VisitorShelfRow({ plankY, bottles, onTapBottle, shelfThemeId }: { plankY: number; bottles: string[]; onTapBottle?: (name: string) => void; shelfThemeId?: ShelfThemeId }) {
  const isDark  = useIsDark();
  const shelfW  = SCREEN_W - SHELF_MX * 2;
  const scrollW = Math.max(shelfW, bottles.length * SLOT_W);
  return (
    <View style={{ position: 'absolute', top: plankY - BOTTLE_H, left: SHELF_MX, right: SHELF_MX, height: BOTTLE_H + PLANK_H + 6 }}>
      <View style={{ position: 'absolute', top: BOTTLE_H - SHELF_OVERLAP, left: 0, right: 0 }}>
        <WoodPlank shelfW={shelfW} shelfThemeId={shelfThemeId} />
      </View>
      <Svg width={shelfW} height={44} style={{ position: 'absolute', top: BOTTLE_H - SHELF_OVERLAP - 3, left: 0 }} pointerEvents="none">
        <Defs>
          <LinearGradient id="vLedG" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0"    stopColor="#ffcc28" stopOpacity={isDark ? 0.62 : 0.26} />
            <Stop offset="0.08" stopColor="#ff9010" stopOpacity={isDark ? 0.24 : 0.10} />
            <Stop offset="0.40" stopColor="#ff6000" stopOpacity={isDark ? 0.08 : 0.03} />
            <Stop offset="1"    stopColor="#ff3000" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <SvgRect x={0} y={0} width={shelfW} height={44} fill="url(#vLedG)" />
      </Svg>
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        scrollEnabled={bottles.length * SLOT_W > shelfW}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: BOTTLE_H }}
        contentContainerStyle={{ width: scrollW, height: BOTTLE_H, flexDirection: 'row', alignItems: 'flex-end' }}
      >
        {bottles.map((name, i) => {
          const imgH = Math.round(BOTTLE_H * BOTTLE_VSCALE[i % BOTTLE_VSCALE.length]);
          return (
            <TouchableOpacity
              key={`v_${name}_${i}`}
              onPress={() => onTapBottle?.(name)}
              activeOpacity={0.75}
              style={{ width: SLOT_W, height: BOTTLE_H }}
            >
              <ExpoImage
                source={{ uri: `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(name)}-Medium.png` }}
                style={{ position: 'absolute', bottom: 0, alignSelf: 'center', width: BOTTLE_W, height: imgH }}
                contentFit="contain"
                transition={200}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function VisitorBarModal({ post, visible, onClose }: {
  post: BarPost | null; visible: boolean; onClose: () => void;
}) {
  const C      = useColors();
  const isDark = useIsDark();
  const { lang, savedBarIds, toggleSavedBar } = useAppStore();
  const [cabH, setCabH] = useState(0);
  const [focusedBottle, setFocusedBottle] = useState<string | null>(null);
  const [visitorPlaying, setVisitorPlaying] = useState(false);

  const shelfPlanks = useMemo(() => SHELF_FRACS.map(f => Math.round(cabH * f)), [cabH]);

  useEffect(() => {
    if (!visible) {
      setCabH(0);
      setFocusedBottle(null);
      setVisitorPlaying(false);
      _visitorAudioUnload();
    }
  }, [visible]);

  const handlePlayerPress = async () => {
    if (!post) return;
    if (visitorPlaying) {
      await _visitorAudioPause();
      setVisitorPlaying(false);
    } else {
      const ok = await _visitorAudioStart(post.bgmUrl);
      setVisitorPlaying(ok);
    }
  };

  if (!post) return null;

  const displayName = lang === 'ko' ? post.barNameKo : post.barName;
  const userName    = lang === 'ko' ? post.userNameKo : post.userName;
  const hearted     = savedBarIds.includes(post.id);

  const PANEL_H = Math.round(SH * 0.86);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>

        {/* Dim backdrop — tap to close */}
        <TouchableOpacity
          style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' }}
          onPress={onClose}
          activeOpacity={1}
        />

        {/* Panel */}
        <View style={{
          height: PANEL_H,
          backgroundColor: C.bg,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
        }}>
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)' }} />
          </View>

          {/* ── Header ── */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10,
            borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
          }}>
            {/* Close button — large touch target */}
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
              style={{ paddingRight: 12, paddingVertical: 10, paddingLeft: 2 }}
            >
              <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
                <Line x1={5} y1={5} x2={17} y2={17} stroke={C.text} strokeWidth={2} strokeLinecap="round" />
                <Line x1={17} y1={5} x2={5} y2={17} stroke={C.text} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </TouchableOpacity>

            {/* Avatar */}
            <Svg width={34} height={34} viewBox="0 0 34 34">
              <Defs>
                <LinearGradient id="vbFsAv" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={post.c1} />
                  <Stop offset="1" stopColor={post.c2} />
                </LinearGradient>
              </Defs>
              <Circle cx="17" cy="17" r="17" fill="url(#vbFsAv)" />
              <SvgText x="17" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="rgba(255,255,255,0.92)">
                {post.initials}
              </SvgText>
            </Svg>

            {/* Name / followers */}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '800', letterSpacing: -0.2 }} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={{ color: C.textDim, fontSize: 11, marginTop: 1 }}>
                {userName} · {post.followers} {lang === 'ko' ? '팔로워' : 'followers'}
              </Text>
            </View>

            {/* Heart */}
            <TouchableOpacity
              onPress={() => toggleSavedBar(post.id)}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8 }}
            >
              <Svg width={20} height={18} viewBox="0 0 16 15">
                <Path d="M8 13.5 L2 8 Q-0.5 5 2.5 2 Q5.5 -0.5 8 3 Q10.5 -0.5 13.5 2 Q16.5 5 14 8 Z"
                  fill={hearted ? '#e0055e' : 'none'}
                  stroke={hearted ? '#e0055e' : C.textDim}
                  strokeWidth={hearted ? 0 : 1.4}
                />
              </Svg>
              <Text style={{ color: hearted ? '#e0055e' : C.textDim, fontSize: 12, fontWeight: '600' }}>
                {post.likes + (hearted ? 1 : 0)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Bar cabinet ── */}
          <View
            style={{ flex: 1, overflow: 'hidden' }}
            onLayout={(e) => { const h = e.nativeEvent.layout.height; if (h > 0) setCabH(h); }}
          >
            <VisitorBarWall barName={post.barName} neonColor={post.neonColor} wallThemeId={post.wallThemeId} />

            {cabH > 0 && (
              <>
                <VisitorPendantLights cabH={cabH} lightColor={post.lightColor} />
                <VisitorShelfRow plankY={shelfPlanks[0]} bottles={post.shelf0} onTapBottle={setFocusedBottle} shelfThemeId={post.shelfThemeId} />
                <VisitorShelfRow plankY={shelfPlanks[1]} bottles={post.shelf1} onTapBottle={setFocusedBottle} shelfThemeId={post.shelfThemeId} />
                <BarCounterDecor counterThemeId={post.counterThemeId} />
                <TouchableOpacity
                  onPress={handlePlayerPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ position: 'absolute', right: 18, top: Math.round(shelfPlanks[0] + (shelfPlanks[1] - shelfPlanks[0]) / 2) - 50 }}
                >
                  <VisitorWallPlayer playerStyleId={post.playerStyleId} playerColorId={post.playerColorId} isPlaying={visitorPlaying} />
                </TouchableOpacity>
              </>
            )}

            {/* Spirits count badge */}
            {cabH > 0 && (
              <View style={{
                position: 'absolute', bottom: 16, right: 16,
                backgroundColor: isDark ? 'rgba(0,0,0,0.60)' : 'rgba(255,255,255,0.82)',
                borderRadius: 10, paddingHorizontal: 11, paddingVertical: 6,
                borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
                flexDirection: 'row', alignItems: 'center', gap: 5,
              }}>
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '800' }}>
                  {post.shelf0.length + post.shelf1.length}
                </Text>
                <Text style={{ color: C.textDim, fontSize: 11 }}>
                  {lang === 'ko' ? '종류' : 'spirits'}
                </Text>
              </View>
            )}
          </View>

          {/* Bottle detail panel */}
          {focusedBottle && post && (
            <VisitorBottlePanel name={focusedBottle} post={post} onClose={() => setFocusedBottle(null)} />
          )}
        </View>
      </View>
    </Modal>
  );
}

function MiniBarPreview({ shelf0, shelf1, height, wallThemeId, neonColor, lightColor, shelfThemeId, counterThemeId, barName }: {
  shelf0: string[]; shelf1: string[]; height: number;
  wallThemeId: WallThemeId; neonColor: string; lightColor: string;
  shelfThemeId?: ShelfThemeId; counterThemeId?: CounterThemeId; barName?: string;
}) {
  const isDark = useIsDark();

  const wallTheme  = BAR_WALL_THEMES.find(t => t.id === wallThemeId)  ?? BAR_WALL_THEMES[0];
  const st         = BAR_SHELF_THEMES.find(t => t.id === shelfThemeId) ?? BAR_SHELF_THEMES[0];
  const ct         = BAR_COUNTER_THEMES.find(t => t.id === counterThemeId) ?? BAR_COUNTER_THEMES[0];

  const wallBg     = isDark ? wallTheme.darkBg : wallTheme.lightBg;
  const shelfFill  = isDark ? st.dark      : st.light;
  const shelfEdge  = isDark ? st.darkEdge  : st.lightEdge;
  const counterTop = isDark ? ct.darkTop   : ct.lightTop;
  const counterBg  = isDark ? ct.dark      : ct.light;

  const signGlow    = isDark ? `${neonColor}2a` : `${neonColor}1a`;
  const ambientGlow = isDark ? `${lightColor}1a` : `${lightColor}18`;

  // Layout positions as pixel offsets
  const signH    = Math.round(height * 0.18);   // neon sign zone height
  const shelf0Y  = Math.round(height * 0.40);   // top plank y
  const shelf1Y  = Math.round(height * 0.65);   // bottom plank y
  const counterY = Math.round(height * 0.83);   // counter top
  const plankH   = Math.max(3, Math.round(height * 0.025));
  const counterH = Math.max(5, Math.round(height * 0.04));

  // Bottle height fills the zone above each shelf; width from flex (each bottle gets equal share)
  const bH0 = Math.max(16, shelf0Y - signH - 2);
  const bH1 = Math.max(12, shelf1Y - shelf0Y - plankH - 2);

  return (
    <View style={{ width: '100%', height, backgroundColor: wallBg, overflow: 'hidden', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>

      {/* Subtle wall texture lines */}
      {[0.22, 0.50, 0.74].map(f => (
        <View key={f} style={{
          position: 'absolute', top: Math.round(height * f), left: 0, right: 0, height: 1,
          backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)',
        }} />
      ))}

      {/* Ambient glow behind bottles */}
      <View style={{
        position: 'absolute', top: signH, left: '10%', right: '10%',
        height: Math.round(height * 0.55), backgroundColor: ambientGlow, borderRadius: height,
      }} />

      {/* ── Neon sign zone ── */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: signH,
        alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Subtle glow halo (reduced) */}
        <View style={{
          position: 'absolute', top: 0, left: '25%', right: '25%', bottom: 0,
          backgroundColor: signGlow, borderRadius: signH,
        }} />
        {barName ? (
          <Text
            numberOfLines={1}
            style={{
              color: neonColor,
              fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'cursive',
              fontSize: Math.max(8, Math.round(height * 0.082)),
              fontWeight: '700',
              letterSpacing: 0.6,
              textShadowColor: neonColor,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 3,
              paddingHorizontal: 6,
            }}
          >
            {barName}
          </Text>
        ) : (
          <View style={{ width: '40%', height: 2, borderRadius: 2, backgroundColor: neonColor, opacity: 0.5 }} />
        )}
      </View>

      {/* ── Top shelf bottles (shelf0) — flex fills full width ── */}
      <View style={{
        position: 'absolute',
        top: signH, left: 0, right: 0, height: bH0,
        flexDirection: 'row', alignItems: 'flex-end',
      }}>
        {shelf0.map((name, i) => (
          <ExpoImage key={`t0_${i}`}
            source={{ uri: `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(name)}-Medium.png` }}
            style={{ flex: 1, height: bH0 }} contentFit="contain" />
        ))}
      </View>

      {/* ── Top plank ── */}
      <View style={{ position: 'absolute', top: shelf0Y, left: 0, right: 0, height: plankH, backgroundColor: shelfFill }} />
      <View style={{ position: 'absolute', top: shelf0Y + plankH, left: 0, right: 0, height: 2, backgroundColor: shelfEdge }} />

      {/* ── Bottom shelf bottles (shelf1) — flex fills full width ── */}
      <View style={{
        position: 'absolute',
        top: shelf0Y + plankH + 1, left: 0, right: 0, height: bH1,
        flexDirection: 'row', alignItems: 'flex-end',
      }}>
        {shelf1.map((name, i) => (
          <ExpoImage key={`t1_${i}`}
            source={{ uri: `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(name)}-Medium.png` }}
            style={{ flex: 1, height: bH1 }} contentFit="contain" />
        ))}
      </View>

      {/* ── Bottom plank ── */}
      <View style={{ position: 'absolute', top: shelf1Y, left: 0, right: 0, height: plankH, backgroundColor: shelfFill }} />
      <View style={{ position: 'absolute', top: shelf1Y + plankH, left: 0, right: 0, height: 2, backgroundColor: shelfEdge }} />

      {/* ── Counter ── */}
      <View style={{ position: 'absolute', top: counterY, left: 0, right: 0, height: counterH, backgroundColor: counterTop }} />
      <View style={{ position: 'absolute', top: counterY + counterH, left: 0, right: 0, bottom: 0, backgroundColor: counterBg }} />

      {/* Neon color accent at very bottom */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: Math.round(height * 0.12),
        backgroundColor: isDark ? `${neonColor}0e` : `${neonColor}07`,
      }} />
    </View>
  );
}

function BarPostCard({ post, onPress }: { post: BarPost; onPress: (p: BarPost) => void }) {
  const { lang, savedBarIds, toggleSavedBar } = useAppStore();
  const C = useColors();
  const [liked, setLiked] = useState(false);
  const saved = savedBarIds.includes(post.id);
  const imgH = post.cardH - 64;
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress(post)}
      style={{
        backgroundColor: C.surface, borderRadius: 16,
        borderWidth: 1, borderColor: C.border,
        overflow: 'hidden', height: post.cardH, marginBottom: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
      }}
    >
      {/* Mini bar preview */}
      <MiniBarPreview shelf0={post.shelf0} shelf1={post.shelf1} height={imgH} wallThemeId={post.wallThemeId} neonColor={post.neonColor} lightColor={post.lightColor} shelfThemeId={post.shelfThemeId} counterThemeId={post.counterThemeId} barName={post.barName} />

      {/* Info footer */}
      <View style={{ flex: 1, paddingHorizontal: 9, paddingTop: 7, paddingBottom: 6 }}>
        {/* User row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <Svg width={22} height={22} viewBox="0 0 22 22">
            <Defs>
              <LinearGradient id={`bpc_${post.id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={post.c1} />
                <Stop offset="1" stopColor={post.c2} />
              </LinearGradient>
            </Defs>
            <Circle cx="11" cy="11" r="11" fill={`url(#bpc_${post.id})`} />
            <SvgText x="11" y="15" textAnchor="middle" fontSize="8" fontWeight="700" fill="rgba(255,255,255,0.92)">
              {post.initials}
            </SvgText>
          </Svg>
          <Text style={{ flex: 1, color: C.text, fontSize: 10, fontWeight: '700' }} numberOfLines={1}>
            {lang === 'ko' ? post.barNameKo : post.barName}
          </Text>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, color: C.textDim, fontSize: 9 }}>
            {lang === 'ko' ? post.userNameKo : post.userName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); setLiked(v => !v); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <Svg width={13} height={12} viewBox="0 0 14 14">
                <Path d="M7 12 L2 7 Q0 4 2.5 2 Q5 0 7 3 Q9 0 11.5 2 Q14 4 12 7 Z"
                  fill={liked ? '#e0055e' : 'none'}
                  stroke={liked ? '#e0055e' : C.textDim}
                  strokeWidth={liked ? 0 : 1.3}
                />
              </Svg>
              <Text style={{ color: C.textDim, fontSize: 9 }}>{post.likes + (liked ? 1 : 0)}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); toggleSavedBar(post.id); }}>
              <Svg width={11} height={13} viewBox="0 0 13 14">
                <Path d="M2 1 L11 1 L11 13 L6.5 10 L2 13 Z"
                  fill={saved ? C.primary : 'none'}
                  stroke={saved ? C.primary : C.textDim}
                  strokeWidth={1.2} strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MasonrySection({ posts, onPressPost }: { posts: BarPost[]; onPressPost: (p: BarPost) => void }) {
  const left  = posts.filter((_, i) => i % 2 === 0);
  const right = posts.filter((_, i) => i % 2 === 1);
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        {left.map(p => <BarPostCard key={p.id} post={p} onPress={onPressPost} />)}
      </View>
      <View style={{ flex: 1 }}>
        {right.map(p => <BarPostCard key={p.id} post={p} onPress={onPressPost} />)}
      </View>
    </View>
  );
}

function ExploreScreen() {
  const C    = useColors();
  const isDark = useIsDark();
  const { lang } = useAppStore();
  const [feedPosts,    setFeedPosts]    = useState<BarPost[]>(BAR_POSTS);
  const [loading,      setLoading]      = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [visitPost,    setVisitPost]    = useState<BarPost | null>(null);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [searchFocused,setSearchFocused]= useState(false);
  const searchRef = useRef<TextInput>(null);
  const batchRef  = useRef(1);
  const busyRef   = useRef(false);

  const loadMore = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setTimeout(() => {
      const b = batchRef.current++;
      const next = BAR_POSTS
        .slice()
        .sort(() => Math.random() - 0.5)
        .map(p => ({ ...p, id: `${p.id}_${b}` }));
      setFeedPosts(prev => [...prev, ...next]);
      setLoading(false);
      busyRef.current = false;
    }, 900);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      batchRef.current = 1;
      setFeedPosts(BAR_POSTS.slice().sort(() => Math.random() - 0.5));
      setRefreshing(false);
    }, 800);
  }, []);

  const handleScroll = useCallback((e: {
    nativeEvent: {
      contentOffset:     { y: number };
      contentSize:       { height: number };
      layoutMeasurement: { height: number };
    };
  }) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentSize.height - contentOffset.y - layoutMeasurement.height < 400) {
      loadMore();
    }
  }, [loadMore]);

  const q = searchQuery.trim().toLowerCase();
  const isSearching = q.length > 0;

  const displayPosts = useMemo(() => {
    if (!isSearching) return feedPosts;
    return BAR_POSTS.filter(p =>
      p.barName.toLowerCase().includes(q) ||
      p.barNameKo.includes(q) ||
      p.userName.toLowerCase().includes(q) ||
      p.userNameKo.includes(q) ||
      p.shelf0.some(b => b.toLowerCase().includes(q)) ||
      p.shelf1.some(b => b.toLowerCase().includes(q))
    );
  }, [q, isSearching, feedPosts]);

  const inputBg    = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.055)';
  const inputBd    = searchFocused
    ? (isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.22)')
    : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)');
  const placeholder = lang === 'ko' ? '바 이름, 유저, 술 검색…' : 'Search bars, users, spirits…';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Search bar header */}
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: inputBg,
          borderRadius: 14, borderWidth: 1, borderColor: inputBd,
          paddingHorizontal: 12, height: 42,
        }}>
          <Svg width={16} height={16} viewBox="0 0 22 22">
            <Circle cx="9.5" cy="9.5" r="6.5" stroke={C.textDim} strokeWidth={2} fill="none"/>
            <Line x1="14.5" y1="14.5" x2="21" y2="21" stroke={C.textDim} strokeWidth={2.2} strokeLinecap="round"/>
          </Svg>
          <TextInput
            ref={searchRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder={placeholder}
            placeholderTextColor={C.textDim}
            style={{
              flex: 1, color: C.text, fontSize: 14,
              paddingVertical: 0,
            }}
            returnKeyType="search"
            clearButtonMode="never"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => { setSearchQuery(''); searchRef.current?.focus(); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={{
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Svg width={10} height={10} viewBox="0 0 10 10">
                  <Line x1={2} y1={2} x2={8} y2={8} stroke={C.textDim} strokeWidth={1.6} strokeLinecap="round"/>
                  <Line x1={8} y1={2} x2={2} y2={8} stroke={C.textDim} strokeWidth={1.6} strokeLinecap="round"/>
                </Svg>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={150}
        onScroll={!isSearching ? handleScroll : undefined}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {displayPosts.length === 0 && isSearching ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
            <Svg width={40} height={40} viewBox="0 0 40 40">
              <Circle cx="17" cy="17" r="12" stroke={C.textDim} strokeWidth={2.5} fill="none" strokeOpacity={0.45}/>
              <Line x1="26" y1="26" x2="37" y2="37" stroke={C.textDim} strokeWidth={2.5} strokeLinecap="round" strokeOpacity={0.45}/>
              <Line x1="12" y1="17" x2="22" y2="17" stroke={C.textDim} strokeWidth={2} strokeLinecap="round" strokeOpacity={0.35}/>
            </Svg>
            <Text style={{ color: C.textDim, fontSize: 14, fontWeight: '600', opacity: 0.7 }}>
              {lang === 'ko' ? `"${searchQuery.trim()}" 검색 결과 없음` : `No results for "${searchQuery.trim()}"`}
            </Text>
            <Text style={{ color: C.textDim, fontSize: 12, opacity: 0.45 }}>
              {lang === 'ko' ? '다른 키워드로 검색해보세요' : 'Try a different keyword'}
            </Text>
          </View>
        ) : (
          <>
            {isSearching && (
              <Text style={{ color: C.textDim, fontSize: 11, fontWeight: '600', marginBottom: 10, marginLeft: 4 }}>
                {lang === 'ko' ? `${displayPosts.length}개 결과` : `${displayPosts.length} result${displayPosts.length !== 1 ? 's' : ''}`}
              </Text>
            )}
            <MasonrySection posts={displayPosts} onPressPost={setVisitPost} />
            {!isSearching && loading && (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={C.primary} />
              </View>
            )}
          </>
        )}
      </ScrollView>

      <VisitorBarModal
        post={visitPost}
        visible={visitPost !== null}
        onClose={() => setVisitPost(null)}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────
// SEARCH SCREEN
// ─────────────────────────────────────────────────────────────────
type SearchFilter = 'all' | 'spirits' | 'recipes' | 'flavor';

function SpiritTypeIcon({ type, size = 18 }: { type: SpiritT; size?: number }) {
  const C = useColors();
  const color = C.primary;
  if (type === 'whiskey') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 2h6l1 5H8L9 2z" stroke={color} strokeWidth={1.4} strokeLinejoin="round"/>
      <Path d="M8 7v1c0 3-2 4-2 8a4 4 0 008 0c0-4-2-5-2-8V7" stroke={color} strokeWidth={1.4} strokeLinejoin="round"/>
    </Svg>
  );
  if (type === 'gin') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10 2h4l2 4v14a2 2 0 01-2 2h-4a2 2 0 01-2-2V6l2-4z" stroke={color} strokeWidth={1.4} strokeLinejoin="round"/>
      <Line x1="8" y1="10" x2="16" y2="10" stroke={color} strokeWidth={1.2}/>
    </Svg>
  );
  if (type === 'tequila') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11 2h2v4l3 3v11a2 2 0 01-2 2H10a2 2 0 01-2-2V9l3-3V2z" stroke={color} strokeWidth={1.4} strokeLinejoin="round"/>
    </Svg>
  );
  if (type === 'vodka') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10 2h4l1 3v15a2 2 0 01-2 2h-2a2 2 0 01-2-2V5l1-3z" stroke={color} strokeWidth={1.4} strokeLinejoin="round"/>
      <Line x1="8" y1="9" x2="16" y2="9" stroke={color} strokeWidth={1.2}/>
    </Svg>
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 2h6l2 5v13a2 2 0 01-2 2H9a2 2 0 01-2-2V7l2-5z" stroke={color} strokeWidth={1.4} strokeLinejoin="round"/>
    </Svg>
  );
}

function SaveBtn({ saved, onPress }: { saved: boolean; onPress: () => void }) {
  const C = useColors();
  return (
    <TouchableOpacity onPress={onPress} style={{ padding: 4 }}>
      <Svg width={16} height={18} viewBox="0 0 16 18">
        <Path d="M2 1.5 L14 1.5 L14 16.5 L8 13 L2 16.5 Z"
          fill={saved ? C.primary : 'none'}
          stroke={saved ? C.primary : C.textDim}
          strokeWidth={1.4} strokeLinejoin="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

function SpiritCard({ spirit, lang }: { spirit: SearchSpirit; lang: Lang }) {
  const { savedSpiritIds, toggleSavedSpirit } = useAppStore();
  const C = useColors();
  const saved = savedSpiritIds.includes(spirit.id);
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: `${C.primary}18`, alignItems: 'center', justifyContent: 'center' }}>
        <SpiritTypeIcon type={spirit.spiritType} size={22} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{spirit.brand}</Text>
          <View style={{ backgroundColor: `${C.primary}20`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
            <Text style={{ fontSize: 10, color: C.primary, fontWeight: '700' }}>{spirit.abv}%</Text>
          </View>
        </View>
        <Text style={{ fontSize: 11, color: C.textDim, marginBottom: 5 }}>
          {lang === 'ko' ? spirit.typeLabelKo : spirit.typeLabel} · {lang === 'ko' ? spirit.originKo : spirit.origin}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {(lang === 'ko' ? spirit.tagsKo : spirit.tags).map(tag => (
            <View key={tag} style={{ backgroundColor: C.surfaceHi, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, color: C.textDim }}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <RadarChart profile={spirit.profile} labels={[]} size={46} />
        <SaveBtn saved={saved} onPress={() => toggleSavedSpirit(spirit.id)} />
      </View>
    </View>
  );
}

function SearchRecipeCard({ recipe, lang }: { recipe: Recipe; lang: Lang }) {
  const { savedRecipeIds, toggleSavedRecipe } = useAppStore();
  const C = useColors();
  const saved = savedRecipeIds.includes(recipe.id);
  const diffColor = recipe.difficulty === 'Easy' ? '#22c55e' : recipe.difficulty === 'Medium' ? '#f59e0b' : '#ef4444';
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: `${recipe.color}28`, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M8 3C8 3 6 5 6 8C6 10 7 11 8 12C9 13 10 14 10 17H14C14 14 15 13 16 12C17 11 18 10 18 8C18 5 16 3 16 3H8Z" stroke={recipe.color} strokeWidth={1.4} strokeLinejoin="round"/>
          <Line x1="10" y1="17" x2="10" y2="21" stroke={recipe.color} strokeWidth={1.4}/>
          <Line x1="14" y1="17" x2="14" y2="21" stroke={recipe.color} strokeWidth={1.4}/>
          <Line x1="8" y1="21" x2="16" y2="21" stroke={recipe.color} strokeWidth={1.4}/>
        </Svg>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{lang === 'ko' ? recipe.nameKo : recipe.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <View style={{ backgroundColor: `${diffColor}20`, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 }}>
            <Text style={{ fontSize: 10, color: diffColor, fontWeight: '700' }}>{recipe.difficulty}</Text>
          </View>
          <Text style={{ fontSize: 11, color: C.textDim }}>{recipe.prepMins} min{recipe.abv != null ? ` · ${recipe.abv}% ABV` : ''}</Text>
        </View>
        <Text style={{ fontSize: 11, color: C.textDim }} numberOfLines={1}>
          {recipe.ingredients.slice(0, 3).join(' · ')}
          {recipe.ingredients.length > 3 ? ' ...' : ''}
        </Text>
      </View>
      <SaveBtn saved={saved} onPress={() => toggleSavedRecipe(recipe.id)} />
    </View>
  );
}

function FlavorCard({ tag, lang, onPress }: { tag: typeof FLAVOR_TAGS[0]; lang: Lang; onPress: (label: string) => void }) {
  const C = useColors();
  const matchedSpirits = SEARCH_SPIRITS.filter(s => tag.spiritTypes.includes(s.spiritType));
  return (
    <TouchableOpacity
      onPress={() => onPress(lang === 'ko' ? tag.labelKo : tag.label)}
      style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'center' }}
    >
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: C.surfaceHi, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 22 }}>{tag.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 }}>
          {lang === 'ko' ? tag.labelKo : tag.label}
        </Text>
        <Text style={{ fontSize: 11, color: C.textDim }}>
          {matchedSpirits.slice(0, 3).map(s => s.brand).join(' · ')}
        </Text>
      </View>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d="M9 18L15 12L9 6" stroke={C.textDim} strokeWidth={1.5} strokeLinecap="round"/>
      </Svg>
    </TouchableOpacity>
  );
}

function SearchScreen() {
  const { lang }   = useAppStore();
  const C          = useColors();
  const [query, setQuery]           = useState('');
  const [filter, setFilter]         = useState<SearchFilter>('all');
  const [recents, setRecents]       = useState<string[]>(['Negroni', 'Bourbon', 'Gin & Tonic', 'Smoky']);
  const [focused, setFocused]       = useState(false);
  const focusAnim                   = useRef(new Animated.Value(0)).current;
  const inputRef                    = useRef<TextInput>(null);

  const q = query.trim().toLowerCase();

  const onFocus = useCallback(() => {
    setFocused(true);
    Animated.timing(focusAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  }, [focusAnim]);

  const onBlur = useCallback(() => {
    setFocused(false);
    Animated.timing(focusAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  }, [focusAnim]);

  const commitSearch = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    setRecents(prev => [t, ...prev.filter(r => r.toLowerCase() !== t.toLowerCase())].slice(0, 8));
    Keyboard.dismiss();
  }, []);

  const borderColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.primary] });

  const matchedSpirits = useMemo<SearchSpirit[]>(() => {
    if (!q) return filter === 'spirits' ? SEARCH_SPIRITS : [];
    return SEARCH_SPIRITS.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.nameKo.includes(q) ||
      s.brand.toLowerCase().includes(q) ||
      s.typeLabel.toLowerCase().includes(q) ||
      s.typeLabelKo.includes(q) ||
      s.origin.toLowerCase().includes(q) ||
      s.originKo.includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q)) ||
      s.tagsKo.some(t => t.includes(q))
    );
  }, [q, filter]);

  const matchedRecipes = useMemo<Recipe[]>(() => {
    if (!q) return filter === 'recipes' ? ALL_RECIPES : [];
    return ALL_RECIPES.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.nameKo.includes(q) ||
      r.descEn.toLowerCase().includes(q) ||
      r.descKo.includes(q) ||
      r.ingredients.some(i => i.toLowerCase().includes(q)) ||
      r.ingredientsKo.some(i => i.includes(q))
    );
  }, [q, filter]);

  const matchedFlavors = useMemo(() => {
    if (!q) return filter === 'flavor' ? FLAVOR_TAGS : [];
    return FLAVOR_TAGS.filter(t =>
      t.label.toLowerCase().includes(q) ||
      t.labelKo.includes(q)
    );
  }, [q, filter]);

  const showSpirits  = filter === 'all' || filter === 'spirits';
  const showRecipes  = filter === 'all' || filter === 'recipes';
  const showFlavors  = filter === 'all' || filter === 'flavor';

  const totalResults = (showSpirits ? matchedSpirits.length : 0)
    + (showRecipes ? matchedRecipes.length : 0)
    + (showFlavors ? matchedFlavors.length : 0);

  const FILTERS: Array<{ id: SearchFilter; label: string; labelKo: string }> = [
    { id:'all',     label:'All',     labelKo:'전체'  },
    { id:'spirits', label:'Spirits', labelKo:'주류'  },
    { id:'recipes', label:'Recipes', labelKo:'레시피'},
    { id:'flavor',  label:'Flavor',  labelKo:'풍미'  },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 }}>
        {/* Search bar */}
        <Animated.View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceHi, borderRadius: 14, borderWidth: 1.5, borderColor, paddingHorizontal: 12, height: 46, gap: 8 }}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Circle cx="11" cy="11" r="7" stroke={focused ? C.primary : C.textDim} strokeWidth={1.6}/>
            <Path d="M17 17L21 21" stroke={focused ? C.primary : C.textDim} strokeWidth={1.6} strokeLinecap="round"/>
          </Svg>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            onFocus={onFocus}
            onBlur={onBlur}
            onSubmitEditing={() => commitSearch(query)}
            placeholder={lang === 'ko' ? '주류, 레시피, 풍미 검색...' : 'Search spirits, recipes, flavors...'}
            placeholderTextColor={C.textDim}
            style={{ flex: 1, color: C.text, fontSize: 14, paddingVertical: 0 }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); inputRef.current?.focus(); }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.textDim, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.bg, fontSize: 11, fontWeight: '800', lineHeight: 18 }}>✕</Text>
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8, flexDirection: 'row' }}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <TouchableOpacity key={f.id} onPress={() => setFilter(f.id)}
              style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: active ? C.primary : C.surfaceHi, borderWidth: 1, borderColor: active ? C.primary : C.border }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: active ? C.bg : C.textDim }}>
                {lang === 'ko' ? f.labelKo : f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Results / Empty state */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 32 }}
      >
        {q === '' ? (
          /* ── Empty: Recent searches ── */
          <>
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.textDim, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 12 }}>
              {lang === 'ko' ? '최근 검색' : 'Recent Searches'}
            </Text>
            {recents.map(r => (
              <TouchableOpacity key={r} onPress={() => { setQuery(r); }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 }}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M3 12C3 7 7 3 12 3C17 3 21 7 21 12C21 17 17 21 12 21" stroke={C.textDim} strokeWidth={1.5} strokeLinecap="round"/>
                  <Path d="M12 7V12L9 15" stroke={C.textDim} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
                </Svg>
                <Text style={{ flex: 1, fontSize: 14, color: C.text }}>{r}</Text>
                <TouchableOpacity onPress={() => setRecents(prev => prev.filter(x => x !== r))}>
                  <Text style={{ color: C.textDim, fontSize: 18, lineHeight: 20 }}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {/* Flavor browse */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.textDim, letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 24, marginBottom: 12 }}>
              {lang === 'ko' ? '풍미로 탐색' : 'Browse by Flavor'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {FLAVOR_TAGS.map(tag => (
                <TouchableOpacity key={tag.id} onPress={() => setQuery(lang === 'ko' ? tag.labelKo : tag.label)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ fontSize: 14 }}>{tag.icon}</Text>
                  <Text style={{ fontSize: 12, color: C.text, fontWeight: '600' }}>{lang === 'ko' ? tag.labelKo : tag.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : totalResults === 0 ? (
          /* ── No results ── */
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
            <Text style={{ fontSize: 36 }}>🔍</Text>
            <Text style={{ fontSize: 15, color: C.textDim, fontWeight: '600' }}>
              {lang === 'ko' ? `"${query}" 결과 없음` : `No results for "${query}"`}
            </Text>
            <Text style={{ fontSize: 12, color: C.textDim, opacity: 0.6 }}>
              {lang === 'ko' ? '다른 키워드로 검색해 보세요.' : 'Try a different keyword.'}
            </Text>
          </View>
        ) : (
          /* ── Results ── */
          <>
            {/* Result count */}
            <Text style={{ fontSize: 11, color: C.textDim, marginBottom: 14 }}>
              {lang === 'ko' ? `${totalResults}개 결과` : `${totalResults} result${totalResults !== 1 ? 's' : ''}`}
            </Text>

            {showSpirits && matchedSpirits.length > 0 && (
              <>
                <Text style={{ fontSize: 11, fontWeight: '800', color: C.textDim, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10 }}>
                  {lang === 'ko' ? '주류' : 'Spirits'}
                </Text>
                {matchedSpirits.map(s => <SpiritCard key={s.id} spirit={s} lang={lang} />)}
              </>
            )}

            {showRecipes && matchedRecipes.length > 0 && (
              <>
                <Text style={{ fontSize: 11, fontWeight: '800', color: C.textDim, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10, marginTop: matchedSpirits.length > 0 ? 14 : 0 }}>
                  {lang === 'ko' ? '레시피' : 'Recipes'}
                </Text>
                {matchedRecipes.map(r => <SearchRecipeCard key={r.id} recipe={r} lang={lang} />)}
              </>
            )}

            {showFlavors && matchedFlavors.length > 0 && (
              <>
                <Text style={{ fontSize: 11, fontWeight: '800', color: C.textDim, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10, marginTop: (matchedSpirits.length + matchedRecipes.length) > 0 ? 14 : 0 }}>
                  {lang === 'ko' ? '풍미' : 'Flavor'}
                </Text>
                {matchedFlavors.map(tag => (
                  <FlavorCard key={tag.id} tag={tag} lang={lang} onPress={txt => { setQuery(txt); commitSearch(txt); }} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────
// ARCHIVE (PROFILE) SCREEN
// ─────────────────────────────────────────────────────────────────
type ArchiveFilter = 'all' | 'spirits' | 'recipes';

function ArchiveEmptyState({ icon, label }: { icon: string; label: string }) {
  const C = useColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
      <Text style={{ fontSize: 32, opacity: 0.4 }}>{icon}</Text>
      <Text style={{ fontSize: 13, color: C.textDim, opacity: 0.7 }}>{label}</Text>
    </View>
  );
}

function ArchiveBarCard({ post, lang, onPress }: { post: BarPost; lang: Lang; onPress: (p: BarPost) => void }) {
  const { savedBarIds, toggleSavedBar } = useAppStore();
  const C = useColors();
  const imgH = post.cardH - 64;
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress(post)}
      style={{
        backgroundColor: C.surface, borderRadius: 16,
        borderWidth: 1, borderColor: C.border,
        overflow: 'hidden', height: post.cardH, marginBottom: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
      }}
    >
      <MiniBarPreview shelf0={post.shelf0} shelf1={post.shelf1} height={imgH} wallThemeId={post.wallThemeId} neonColor={post.neonColor} lightColor={post.lightColor} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 6 }}>
        <Svg width={20} height={20} viewBox="0 0 20 20">
          <Defs>
            <LinearGradient id={`arc_${post.id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={post.c1} />
              <Stop offset="1" stopColor={post.c2} />
            </LinearGradient>
          </Defs>
          <Circle cx="10" cy="10" r="10" fill={`url(#arc_${post.id})`} />
          <SvgText x="10" y="13.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="rgba(255,255,255,0.92)">{post.initials}</SvgText>
        </Svg>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.text }} numberOfLines={1}>
            {lang === 'ko' ? post.barNameKo : post.barName}
          </Text>
          <Text style={{ fontSize: 9, color: C.textDim }} numberOfLines={1}>{post.followers} followers</Text>
        </View>
        <SaveBtn saved={savedBarIds.includes(post.id)} onPress={() => toggleSavedBar(post.id)} />
      </View>
    </TouchableOpacity>
  );
}

function ArchiveSpiritCard({ spirit, lang }: { spirit: SearchSpirit; lang: Lang }) {
  const { savedSpiritIds, toggleSavedSpirit } = useAppStore();
  const C = useColors();
  const saved = savedSpiritIds.includes(spirit.id);
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 13, marginBottom: 10, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <View style={{ width: 44, height: 56, borderRadius: 10, backgroundColor: `${C.primary}14`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {imgFailed ? (
          <SpiritTypeIcon type={spirit.spiritType} size={20} />
        ) : (
          <ExpoImage
            source={{ uri: `https://www.thecocktaildb.com/images/ingredients/${spirit.apiName}-Medium.png` }}
            style={{ width: 38, height: 50 }} contentFit="contain"
            onError={() => setImgFailed(true)}
          />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{spirit.brand}</Text>
          <View style={{ backgroundColor: `${C.primary}20`, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text style={{ fontSize: 9, color: C.primary, fontWeight: '700' }}>{spirit.abv}%</Text>
          </View>
        </View>
        <Text style={{ fontSize: 10, color: C.textDim }}>
          {lang === 'ko' ? spirit.typeLabelKo : spirit.typeLabel} · {lang === 'ko' ? spirit.originKo : spirit.origin}
        </Text>
      </View>
      <RadarChart profile={spirit.profile} labels={[]} size={44} />
      <SaveBtn saved={saved} onPress={() => toggleSavedSpirit(spirit.id)} />
    </View>
  );
}

function ArchiveRecipeCard({ recipe, lang }: { recipe: Recipe; lang: Lang }) {
  const { savedRecipeIds, toggleSavedRecipe } = useAppStore();
  const C = useColors();
  const saved = savedRecipeIds.includes(recipe.id);
  const diffColor = recipe.difficulty === 'Easy' ? '#22c55e' : recipe.difficulty === 'Medium' ? '#f59e0b' : '#ef4444';
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!recipe.heroApiName && !imgFailed;
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 13, marginBottom: 10, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <View style={{ width: 44, height: 56, borderRadius: 10, backgroundColor: `${recipe.color}28`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {showImg ? (
          <ExpoImage
            source={{ uri: `https://www.thecocktaildb.com/images/ingredients/${recipe.heroApiName}-Medium.png` }}
            style={{ width: 38, height: 50 }} contentFit="contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M8 3C8 3 6 5 6 8C6 10 7 11 8 12C9 13 10 14 10 17H14C14 14 15 13 16 12C17 11 18 10 18 8C18 5 16 3 16 3H8Z" stroke={recipe.color} strokeWidth={1.4} strokeLinejoin="round"/>
            <Line x1="10" y1="17" x2="10" y2="21" stroke={recipe.color} strokeWidth={1.4}/>
            <Line x1="14" y1="17" x2="14" y2="21" stroke={recipe.color} strokeWidth={1.4}/>
            <Line x1="8" y1="21" x2="16" y2="21" stroke={recipe.color} strokeWidth={1.4}/>
          </Svg>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 }}>
          {lang === 'ko' ? recipe.nameKo : recipe.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ backgroundColor: `${diffColor}20`, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text style={{ fontSize: 9, color: diffColor, fontWeight: '700' }}>{recipe.difficulty}</Text>
          </View>
          <Text style={{ fontSize: 10, color: C.textDim }}>{recipe.prepMins} min{recipe.abv != null ? ` · ${recipe.abv}%` : ''}</Text>
        </View>
      </View>
      <SaveBtn saved={saved} onPress={() => toggleSavedRecipe(recipe.id)} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// TASTE GENOME VIEW
// ─────────────────────────────────────────────────────────────────
function TasteGenomeView({ lang }: { lang: Lang }) {
  const { journalEntries, inventoryItems } = useAppStore();
  const C      = useColors();
  const styles = useStyles();
  const t      = TEXTS[lang];

  const genome  = useMemo(() => computeGenomeProfile(inventoryItems, journalEntries), [inventoryItems, journalEntries]);
  const insight = genome ? genomeInsightText(genome, lang) : '';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Genome radar card */}
      <View style={styles.genomeCard}>
        <Text style={styles.genomeSeclbl}>{t.genomeLabel}</Text>
        {genome ? (
          <>
            <RadarChart profile={genome} labels={t.radarLabels} size={200} />
            <Text style={styles.genomeInsight}>{insight}</Text>
          </>
        ) : (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🧬</Text>
            <Text style={{ fontSize: 13, color: C.textDim, textAlign: 'center', lineHeight: 19, paddingHorizontal: 16 }}>
              {t.genomeEmpty}
            </Text>
          </View>
        )}
      </View>

      {/* Journal entries */}
      <Text style={{ fontSize: 11, fontWeight: '800', color: C.textDim, letterSpacing: 1.1, textTransform: 'uppercase', marginHorizontal: 20, marginBottom: 10 }}>
        {t.genomeJournal}
      </Text>
      {journalEntries.length === 0 ? (
        <View style={{ marginHorizontal: 20, padding: 24, alignItems: 'center', backgroundColor: C.surfaceHi, borderRadius: 14, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 26, marginBottom: 8 }}>📖</Text>
          <Text style={{ fontSize: 13, color: C.textDim, textAlign: 'center', lineHeight: 20 }}>
            {t.genomeEmpty}
          </Text>
        </View>
      ) : (
        journalEntries.map(entry => (
          <View key={entry.id} style={styles.journalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, flex: 1, lineHeight: 20 }}>{entry.mixName}</Text>
              <Text style={{ fontSize: 13, color: C.accent }}>{'★'.repeat(entry.rating)}</Text>
            </View>
            <Text style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>{entry.savedAt}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {entry.tags.map(tag => (
                <Text key={tag} style={[styles.journalTag, { color: C.accent, backgroundColor: `${C.accent}14` }]}>{tag}</Text>
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function ProfileScreen() {
  const {
    lang, toggleLang, theme, toggleTheme,
    barName, setBarName, myBarBio, setMyBarBio, barNeonColor,
    savedBarIds, savedSpiritIds, savedRecipeIds, inventoryItems,
  } = useAppStore();
  const C       = useColors();
  const isDark  = useIsDark();
  const styles  = useStyles();
  const t       = TEXTS[lang];

  const [filter,       setFilter]       = useState<ArchiveFilter>('all');
  const [profileView,  setProfileView]  = useState<ProfileView>('archive');
  const [visitPost,    setVisitPost]    = useState<BarPost | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editModal,    setEditModal]    = useState(false);
  const [heartModal,   setHeartModal]   = useState(false);
  const [draftName,    setDraftName]    = useState('');
  const [draftBio,     setDraftBio]     = useState('');

  const savedBars    = BAR_POSTS.filter(p => savedBarIds.includes(p.id));
  const savedSpirits = SEARCH_SPIRITS.filter(s => savedSpiritIds.includes(s.id));
  const savedRecipes = ALL_RECIPES.filter(r => savedRecipeIds.includes(r.id));
  const archiveCount = savedSpirits.length + savedRecipes.length;

  const FILTERS: Array<{ id: ArchiveFilter; label: string; labelKo: string; count: number }> = [
    { id:'all',     label:'All',     labelKo:'전체',   count: archiveCount },
    { id:'spirits', label:'Spirits', labelKo:'주류',   count: savedSpirits.length },
    { id:'recipes', label:'Recipes', labelKo:'레시피', count: savedRecipes.length },
  ];

  const showSpirits = filter === 'all' || filter === 'spirits';
  const showRecipes = filter === 'all' || filter === 'recipes';

  /* initials from barName */
  const initials = barName.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || 'B';

  const openEdit = () => { setDraftName(barName); setDraftBio(myBarBio); setEditModal(true); };
  const saveEdit = () => { setBarName(draftName.trim() || barName); setMyBarBio(draftBio.trim()); setEditModal(false); };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[]} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Top bar ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 }}>
          <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: -0.3 }}>
            {barName}
          </Text>
          <TouchableOpacity onPress={() => setShowSettings(v => !v)}
            style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="3" stroke={C.textDim} strokeWidth={1.5} fill="none"/>
              <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                stroke={C.textDim} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Settings panel */}
        {showSettings && (
          <View style={{ marginHorizontal: 18, marginBottom: 10, backgroundColor: C.surfaceHi, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ fontSize: 14, color: C.text, fontWeight: '500' }}>{lang === 'ko' ? '테마' : 'Theme'}</Text>
              <TouchableOpacity onPress={toggleTheme}
                style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary }}>{theme === 'dark' ? '☾ Dark' : '☼ Light'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ fontSize: 14, color: C.text, fontWeight: '500' }}>{lang === 'ko' ? '언어' : 'Language'}</Text>
              <TouchableOpacity onPress={toggleLang}
                style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary }}>{lang === 'en' ? 'EN' : 'KO'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
              <Text style={{ fontSize: 14, color: C.text, fontWeight: '500' }}>{lang === 'ko' ? '계정' : 'Account'}</Text>
              <TouchableOpacity onPress={() => useAuthStore.getState().signOut()}
                style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#ef5350' }}>{lang === 'ko' ? '로그아웃' : 'Sign Out'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Instagram-style profile header ── */}
        <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 16 }}>
          {/* Avatar + stats row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            {/* Avatar */}
            <View style={{ marginRight: 24 }}>
              <Svg width={80} height={80} viewBox="0 0 80 80">
                <Defs>
                  <LinearGradient id="avatarGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={barNeonColor} />
                    <Stop offset="1" stopColor={isDark ? '#1a0a2e' : '#3a0a6e'} />
                  </LinearGradient>
                  <LinearGradient id="avatarRing" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#f09433" />
                    <Stop offset="0.25" stopColor="#e6683c" />
                    <Stop offset="0.5" stopColor="#dc2743" />
                    <Stop offset="0.75" stopColor="#cc2366" />
                    <Stop offset="1" stopColor="#bc1888" />
                  </LinearGradient>
                </Defs>
                {/* Ring border (like Instagram) */}
                <Circle cx="40" cy="40" r="39" fill="url(#avatarRing)" />
                <Circle cx="40" cy="40" r="35" fill={C.bg} />
                <Circle cx="40" cy="40" r="33" fill="url(#avatarGrad)" />
                <SvgText x="40" y="46" textAnchor="middle" fontSize="22" fontWeight="800" fill="rgba(255,255,255,0.92)">{initials}</SvgText>
              </Svg>
            </View>

            {/* Stats */}
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>{inventoryItems.length}</Text>
                <Text style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>{lang === 'ko' ? '보관중' : 'Cellar'}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>{savedRecipes.length}</Text>
                <Text style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>{lang === 'ko' ? '레시피' : 'Recipes'}</Text>
              </View>
              {/* Heart stat — tappable */}
              <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => setHeartModal(true)}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>{savedBars.length}</Text>
                <Text style={{ fontSize: 11, color: '#ff5f7e', marginTop: 1 }}>♥ {lang === 'ko' ? '하트한 바' : 'Liked Bars'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Name + bio */}
          <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 3 }}>{barName}</Text>
          {myBarBio ? (
            <Text style={{ fontSize: 13, color: C.textDim, lineHeight: 18, marginBottom: 12 }}>{myBarBio}</Text>
          ) : (
            <Text style={{ fontSize: 13, color: C.textDim, fontStyle: 'italic', marginBottom: 12, opacity: 0.5 }}>
              {lang === 'ko' ? '바 소개를 작성해보세요' : 'Add a bar description'}
            </Text>
          )}

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={openEdit}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{lang === 'ko' ? '프로필 편집' : 'Edit Profile'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{lang === 'ko' ? '내 바 보러가기' : 'My Bar'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Divider ── */}
        <View style={{ height: 1, backgroundColor: C.border, marginBottom: 0 }} />

        {/* ── Tab toggle ── */}
        <View style={styles.genomeToggle}>
          {(['genome', 'archive'] as ProfileView[]).map(view => {
            const active = profileView === view;
            return (
              <TouchableOpacity key={view} onPress={() => setProfileView(view)}
                style={[styles.genomeToggleTab, active && styles.genomeTabActive]}>
                <Text style={[styles.genomeTabTxt, active && styles.genomeTabTxtAct]}>
                  {view === 'genome' ? t.viewGenome : t.viewArchive}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Content ── */}
        {profileView === 'genome' ? (
          <TasteGenomeView lang={lang} />
        ) : (
          <View style={{ paddingHorizontal: 18 }}>
            {/* ♥ Heart archive button */}
            <TouchableOpacity
              onPress={() => setHeartModal(true)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: isDark ? 'rgba(255,95,126,0.10)' : 'rgba(255,95,126,0.07)',
                borderWidth: 1, borderColor: 'rgba(255,95,126,0.30)',
                borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
                marginTop: 14, marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 20 }}>♥</Text>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#ff5f7e' }}>
                    {lang === 'ko' ? '하트한 바 구경하기' : 'Liked Bars Archive'}
                  </Text>
                  <Text style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>
                    {lang === 'ko' ? `${savedBars.length}개의 바를 저장했어요` : `${savedBars.length} bars saved`}
                  </Text>
                </View>
              </View>
              <Text style={{ color: C.textDim, fontSize: 16 }}>›</Text>
            </TouchableOpacity>

            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40, marginBottom: 12 }} contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
              {FILTERS.map(f => {
                const active = filter === f.id;
                return (
                  <TouchableOpacity key={f.id} onPress={() => setFilter(f.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20, backgroundColor: active ? C.primary : C.surfaceHi, borderWidth: 1, borderColor: active ? C.primary : C.border }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? C.bg : C.textDim }}>
                      {lang === 'ko' ? f.labelKo : f.label}
                    </Text>
                    {f.count > 0 && (
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: active ? `${C.bg}30` : `${C.primary}20`, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: active ? C.bg : C.primary }}>{f.count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Archive content */}
            {archiveCount === 0 ? (
              <ArchiveEmptyState icon="🗂" label={lang === 'ko' ? '아직 저장된 항목이 없어요' : 'Nothing saved yet'} />
            ) : (
              <>
                {showSpirits && (
                  <>
                    {filter === 'all' && (
                      <Text style={{ fontSize: 11, fontWeight: '800', color: C.textDim, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10 }}>
                        {lang === 'ko' ? `저장한 주류 (${savedSpirits.length})` : `Saved Spirits (${savedSpirits.length})`}
                      </Text>
                    )}
                    {savedSpirits.length === 0
                      ? <ArchiveEmptyState icon="🥃" label={lang === 'ko' ? '저장한 주류가 없어요' : 'No saved spirits'} />
                      : savedSpirits.map(s => <ArchiveSpiritCard key={s.id} spirit={s} lang={lang} />)
                    }
                  </>
                )}
                {showRecipes && (
                  <>
                    {filter === 'all' && (
                      <Text style={{ fontSize: 11, fontWeight: '800', color: C.textDim, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10, marginTop: showSpirits && savedSpirits.length > 0 ? 16 : 0 }}>
                        {lang === 'ko' ? `저장한 레시피 (${savedRecipes.length})` : `Saved Recipes (${savedRecipes.length})`}
                      </Text>
                    )}
                    {savedRecipes.length === 0
                      ? <ArchiveEmptyState icon="🍹" label={lang === 'ko' ? '저장한 레시피가 없어요' : 'No saved recipes'} />
                      : savedRecipes.map(r => <ArchiveRecipeCard key={r.id} recipe={r} lang={lang} />)
                    }
                  </>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── 프로필 편집 모달 ── */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setEditModal(false); }} />
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: C.text }}>{lang === 'ko' ? '프로필 편집' : 'Edit Profile'}</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Text style={{ color: C.textDim, fontSize: 15 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.textDim, marginBottom: 6 }}>{lang === 'ko' ? '바 이름' : 'Bar Name'}</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder={lang === 'ko' ? '바 이름' : 'Bar name'}
              placeholderTextColor={C.textDim}
              style={{ backgroundColor: C.surfaceHi, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.text, marginBottom: 14 }}
            />
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.textDim, marginBottom: 6 }}>{lang === 'ko' ? '바 소개' : 'Bio'}</Text>
            <TextInput
              value={draftBio}
              onChangeText={setDraftBio}
              placeholder={lang === 'ko' ? '나만의 바 소개를 적어보세요' : 'Write something about your bar'}
              placeholderTextColor={C.textDim}
              multiline
              numberOfLines={3}
              style={{ backgroundColor: C.surfaceHi, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.text, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 }}
            />
            <TouchableOpacity onPress={saveEdit}
              style={{ backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: C.bg, fontSize: 15, fontWeight: '800' }}>{lang === 'ko' ? '저장' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 하트한 바 모달 ── */}
      <Modal visible={heartModal} animationType="slide" transparent={false} onRequestClose={() => setHeartModal(false)}>
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <TouchableOpacity onPress={() => setHeartModal(false)} style={{ marginRight: 14 }}>
              <Text style={{ fontSize: 22, color: C.text }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, flex: 1 }}>
              ♥ {lang === 'ko' ? '하트한 바' : 'Liked Bars'}
            </Text>
            <Text style={{ fontSize: 13, color: C.textDim }}>{savedBars.length}</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 }}>
            {savedBars.length === 0 ? (
              <ArchiveEmptyState icon="♥" label={lang === 'ko' ? '하트한 바가 없어요' : 'No liked bars yet'} />
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  {savedBars.filter((_, i) => i % 2 === 0).map(p => (
                    <ArchiveBarCard key={p.id} post={p} lang={lang} onPress={(post) => { setHeartModal(false); setVisitPost(post); }} />
                  ))}
                </View>
                <View style={{ flex: 1 }}>
                  {savedBars.filter((_, i) => i % 2 === 1).map(p => (
                    <ArchiveBarCard key={p.id} post={p} lang={lang} onPress={(post) => { setHeartModal(false); setVisitPost(post); }} />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <VisitorBarModal
        post={visitPost}
        visible={visitPost !== null}
        onClose={() => setVisitPost(null)}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────
// AUTH SCREEN
// ─────────────────────────────────────────────────────────────────
function AuthScreen({ onClose }: { onClose?: () => void }) {
  const { signIn, signUp, error, clearError } = useAuthStore();
  const lang = useAppStore(s => s.lang);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
    } catch {}
    setLoading(false);
  };

  // 항상 라이트 테마 색상 고정
  const L = LIGHT_C;
  // 라이트 모드 NeonText 렌더링 (홈 화면 BarWall 라이트 모드와 동일)
  const signColor = L.accent; // '#b87800'
  const neonScriptSt = {
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'cursive',
    fontWeight: '400' as const,
    textAlign: 'center' as const,
    letterSpacing: 2,
    fontSize: 52,
  };
  const neonShadow = (r: number) => ({
    textShadowColor: signColor,
    textShadowRadius: r,
    textShadowOffset: { width: 0, height: 0 },
  });

  return (
    <View style={{ flex: 1, backgroundColor: L.bg }}>
      {/* 라이트 모드 앰비언트 — 따뜻한 크림 워시 */}
      <View style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: L.accent, opacity: 0.06 }} pointerEvents="none" />
      <View style={{ position: 'absolute', bottom: 40, left: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: L.primary, opacity: 0.04 }} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }}>
        {/* 닫기 버튼 — 모달로 열릴 때만 표시 */}
        {onClose && (
          <TouchableOpacity onPress={onClose}
            style={{ position: 'absolute', top: 16, right: 20, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: `${L.border}80`, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18, color: L.textDim, lineHeight: 20 }}>✕</Text>
          </TouchableOpacity>
        )}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Logo — BarWall 라이트 모드 사인과 동일 ── */}
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 8 }}>
                <View style={{ width: 64, borderTopWidth: 1, borderColor: `${signColor}45` }} />
                <View style={{ height: 14 }} />
                {/* 라이트 모드 NeonText 인라인 렌더링 */}
                <View style={{ alignItems: 'center' }}>
                  <Text style={[neonScriptSt, { color: 'transparent', ...neonShadow(18) }]}>OntheRock</Text>
                  <Text style={[neonScriptSt, { color: signColor, ...neonShadow(7), position: 'absolute', top: 0, left: 0, right: 0 }]}>OntheRock</Text>
                </View>
                <Text style={{ fontSize: 9, letterSpacing: 3.5, fontWeight: '600', color: `${signColor}70`, marginTop: 6 }}>
                  EST. 2025
                </Text>
                <View style={{ height: 14 }} />
                <View style={{ width: 64, borderTopWidth: 1, borderColor: `${signColor}38` }} />
              </View>
              <Text style={{ fontSize: 12, color: L.textDim, marginTop: 12, letterSpacing: 1.5, textAlign: 'center' }}>
                {lang === 'ko' ? '나만의 홈 바를 시작하세요' : 'Curate your personal home bar'}
              </Text>
            </View>

            {/* ── Form card ── */}
            <View style={{
              backgroundColor: L.surface, borderRadius: 22, borderWidth: 1,
              borderColor: L.border, padding: 22,
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.10, shadowRadius: 16, elevation: 4,
            }}>
              {/* Mode toggle */}
              <View style={{
                flexDirection: 'row', backgroundColor: L.surfaceHi,
                borderRadius: 13, padding: 4, marginBottom: 26,
                borderWidth: 1, borderColor: L.border,
              }}>
                {(['signin', 'signup'] as const).map(m => (
                  <TouchableOpacity key={m} onPress={() => { setMode(m); clearError(); }}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                      backgroundColor: mode === m ? L.bg : 'transparent',
                      borderWidth: mode === m ? 1 : 0,
                      borderColor: mode === m ? L.border : 'transparent',
                    }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.5, color: mode === m ? L.primary : L.textDim }}>
                      {m === 'signin' ? (lang === 'ko' ? '로그인' : 'Sign In') : (lang === 'ko' ? '회원가입' : 'Sign Up')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Email */}
              <Text style={{ fontSize: 10, fontWeight: '700', color: L.textDim, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 8 }}>
                {lang === 'ko' ? '이메일' : 'Email'}
              </Text>
              <TextInput
                value={email}
                onChangeText={v => { setEmail(v); clearError(); }}
                placeholder="your@email.com"
                placeholderTextColor={L.border}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: L.bg, borderRadius: 12, borderWidth: 1,
                  borderColor: L.border, paddingHorizontal: 16, paddingVertical: 14,
                  fontSize: 15, color: L.text, marginBottom: 20,
                }}
              />

              {/* Password */}
              <Text style={{ fontSize: 10, fontWeight: '700', color: L.textDim, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 8 }}>
                {lang === 'ko' ? '비밀번호' : 'Password'}
              </Text>
              <TextInput
                value={password}
                onChangeText={v => { setPassword(v); clearError(); }}
                placeholder={lang === 'ko' ? '6자 이상' : '6+ characters'}
                placeholderTextColor={L.border}
                secureTextEntry
                style={{
                  backgroundColor: L.bg, borderRadius: 12, borderWidth: 1,
                  borderColor: error ? '#c0404066' : L.border,
                  paddingHorizontal: 16, paddingVertical: 14,
                  fontSize: 15, color: L.text, marginBottom: error ? 14 : 28,
                }}
              />

              {/* Error */}
              {!!error && (
                <View style={{ backgroundColor: '#c0404012', borderRadius: 10, borderWidth: 1, borderColor: '#c0404030', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20 }}>
                  <Text style={{ fontSize: 13, color: '#b03030', textAlign: 'center', lineHeight: 18 }}>{error}</Text>
                </View>
              )}

              {/* CTA */}
              <TouchableOpacity onPress={handleSubmit} disabled={loading}
                style={{
                  backgroundColor: L.primary, borderRadius: 14, paddingVertical: 16,
                  alignItems: 'center', opacity: loading ? 0.65 : 1,
                  shadowColor: L.primary, shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
                }}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 2, textTransform: 'uppercase' }}>
                      {mode === 'signin' ? (lang === 'ko' ? '로그인' : 'Sign In') : (lang === 'ko' ? '회원가입' : 'Sign Up')}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────
export default function App() {
  const { user, initializing } = useAuthStore();

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
    const unsubscribeAuth = initAuthListener();

    // Onboarding seed injection
    const state = useAppStore.getState();
    if (!state.seedInjected && state.inventoryItems.length === 0) {
      const seeds: InventoryItem[] = [
        {
          id: 'seed_bourbon', name: 'Bourbon Whiskey', apiName: 'Bourbon', spiritType: 'whiskey',
          brand: "Maker's Mark", abv: 45, quantity: 'full',
          profile: { sweet: 4, sour: 1, bitter: 2, body: 4, aroma: 4 },
          desc: { en: "Rich American whiskey with vanilla and caramel.", ko: "바닐라와 캐러멜 풍미가 깊은 미국 위스키." },
          myRating: 4,
          purchaseDate: new Date().toLocaleDateString('ko-KR'),
          openedDate: new Date().toLocaleDateString('ko-KR'),
          myNote: { en: 'Rich caramel finish.', ko: '캐러멜 피니시가 훌륭해요.' }
        },
        {
          id: 'seed_gin', name: 'London Dry Gin', apiName: 'Gin', spiritType: 'gin',
          brand: "Tanqueray", abv: 47, quantity: 'full',
          profile: { sweet: 1, sour: 1, bitter: 3, body: 2, aroma: 4 },
          desc: { en: "Crisp and classic gin with strong juniper and citrus.", ko: "주니퍼베리와 시트러스 향이 강한 클래식 진." },
          myRating: 4,
          purchaseDate: new Date().toLocaleDateString('ko-KR'),
          openedDate: new Date().toLocaleDateString('ko-KR'),
          myNote: { en: 'Very crisp G&T.', ko: '진토닉용으로 완벽합니다.' }
        },
        {
          id: 'seed_rum', name: 'White Rum', apiName: 'Rum', spiritType: 'rum',
          brand: "Bacardi Superior", abv: 40, quantity: 'full',
          profile: { sweet: 2, sour: 0, bitter: 1, body: 2, aroma: 3 },
          desc: { en: "Light and clean rum, perfect for refreshing cocktails.", ko: "상쾌한 칵테일에 아주 잘 어울리는 가볍고 깨끗한 럼." },
          myRating: 4,
          purchaseDate: new Date().toLocaleDateString('ko-KR'),
          openedDate: new Date().toLocaleDateString('ko-KR'),
          myNote: { en: 'Clean and sweet.', ko: '가볍고 은은한 단맛.' }
        }
      ];
      useAppStore.setState({
        inventoryItems: seeds,
        shelf0Ids: seeds.filter((_, i) => i % 2 === 0).map(s => s.id),
        shelf1Ids: seeds.filter((_, i) => i % 2 === 1).map(s => s.id),
        seedInjected: true
      });
    }

    return () => { unsubscribeAuth(); };
  }, []);

  if (initializing) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#1c1a24', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#c9a84c" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <AuthScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SlidingTabContainer />
    </SafeAreaProvider>
  );
}
