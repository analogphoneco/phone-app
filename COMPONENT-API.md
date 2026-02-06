# Component API Reference

Quick reference for all new UI components.

---

## 🔘 Buttons

### PrimaryButton
**Use for:** Main CTAs, primary actions
**Style:** Brand red (#C73A32), white text, shadow

```tsx
import { PrimaryButton } from '@/components/ui/button';

<PrimaryButton 
  title="Subscribe Now"
  onPress={() => handleSubscribe()}
  disabled={false}
  loading={false}
  icon="creditcard.fill"
  iconSize={20}
  fullWidth={true}
  style={{ marginTop: 20 }}
/>
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | ✅ | - | Button text |
| `onPress` | `() => void` | ✅ | - | Press handler |
| `disabled` | `boolean` | ❌ | `false` | Disable button |
| `loading` | `boolean` | ❌ | `false` | Show loading spinner |
| `icon` | `SF Symbol` | ❌ | - | Icon name |
| `iconSize` | `number` | ❌ | `20` | Icon size in px |
| `fullWidth` | `boolean` | ❌ | `false` | Expand to 100% |
| `style` | `ViewStyle` | ❌ | - | Additional styles |

---

### SecondaryButton
**Use for:** Secondary actions, cancel, back
**Style:** Outlined, no background, brand border

```tsx
import { SecondaryButton } from '@/components/ui/button';

<SecondaryButton 
  title="Cancel"
  onPress={() => router.back()}
  icon="xmark"
  iconSize={18}
/>
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | ✅ | - | Button text |
| `onPress` | `() => void` | ✅ | - | Press handler |
| `disabled` | `boolean` | ❌ | `false` | Disable button |
| `loading` | `boolean` | ❌ | `false` | Show loading spinner |
| `icon` | `SF Symbol` | ❌ | - | Icon name |
| `iconSize` | `number` | ❌ | `18` | Icon size in px |
| `fullWidth` | `boolean` | ❌ | `false` | Expand to 100% |
| `style` | `ViewStyle` | ❌ | - | Additional styles |

---

### AccentButton
**Use for:** Special features, premium actions
**Style:** Film yellow (#EFC14A), dark text, shadow

```tsx
import { AccentButton } from '@/components/ui/button';

<AccentButton 
  title="Share Setup Link"
  onPress={handleShare}
  icon="square.and.arrow.up"
  fullWidth
/>
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | ✅ | - | Button text |
| `onPress` | `() => void` | ✅ | - | Press handler |
| `disabled` | `boolean` | ❌ | `false` | Disable button |
| `loading` | `boolean` | ❌ | `false` | Show loading spinner |
| `icon` | `SF Symbol` | ❌ | - | Icon name |
| `iconSize` | `number` | ❌ | `20` | Icon size in px |
| `fullWidth` | `boolean` | ❌ | `false` | Expand to 100% |
| `style` | `ViewStyle` | ❌ | - | Additional styles |

---

### GhostButton
**Use for:** Tertiary actions, info links
**Style:** Text only, no background or border

```tsx
import { GhostButton } from '@/components/ui/button';

<GhostButton 
  title="Learn More"
  onPress={showInfo}
  icon="info.circle"
  iconSize={18}
/>
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | ✅ | - | Button text |
| `onPress` | `() => void` | ✅ | - | Press handler |
| `disabled` | `boolean` | ❌ | `false` | Disable button |
| `icon` | `SF Symbol` | ❌ | - | Icon name |
| `iconSize` | `number` | ❌ | `18` | Icon size in px |
| `style` | `ViewStyle` | ❌ | - | Additional styles |

---

## 📝 Input

### Input
**Use for:** All text inputs
**Features:** Labels, icons, animations, validation states

```tsx
import { Input } from '@/components/ui/input';

<Input
  value={email}
  onChangeText={setEmail}
  placeholder="Enter your email"
  label="Email Address"
  icon="envelope"
  error={emailError}
  success={emailValid}
  keyboardType="email-address"
  autoCapitalize="none"
  containerStyle={{ marginBottom: 20 }}
/>
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `string` | ✅ | - | Input value |
| `onChangeText` | `(text: string) => void` | ✅ | - | Change handler |
| `placeholder` | `string` | ❌ | - | Placeholder text |
| `label` | `string` | ❌ | - | Label above input |
| `icon` | `SF Symbol` | ❌ | - | Left icon |
| `error` | `string` | ❌ | - | Error message (shows red) |
| `success` | `boolean` | ❌ | `false` | Show green checkmark |
| `containerStyle` | `ViewStyle` | ❌ | - | Container styles |
| `style` | `TextStyle` | ❌ | - | Input text styles |
| All `TextInputProps` | - | ❌ | - | Native props supported |

**States:**
- **Normal:** Gray border
- **Focused:** Animates to brand color (150ms)
- **Success:** Green checkmark icon
- **Error:** Red border + icon + message below

---

## 🎨 Theme System

### useAppStyles Hook

```tsx
import { useAppStyles } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';

function MyComponent() {
  const colorScheme = useColorScheme();
  const { colors, typography, styles, elevation, animation } = useAppStyles(colorScheme);
  
  return (
    <View style={[styles.card, elevation.md]}>
      <Text style={typography.title2}>Hello</Text>
    </View>
  );
}
```

### Colors

```tsx
colors.text              // Primary text (#1A1A1A light, #F7F5F2 dark)
colors.background        // Screen background (#E8E1D6 light, #1F1D1B dark)
colors.surface           // Card background (#F7F5F2 light, #2A2826 dark)
colors.tint              // Brand red (#C73A32 light, #EFC14A dark)
colors.accent            // Film yellow (#EFC14A light, #C73A32 dark)
colors.icon              // Muted gray (#8A8379)
colors.success           // Success green (#027a2a)
colors.error             // Error red (#dc3545)
```

### Typography

```tsx
typography.largeTitle    // 32-48px, bold
typography.title1        // 26px, bold
typography.title2        // 22px, bold
typography.title3        // 20px, medium
typography.body          // 17px, regular
typography.bodyMedium    // 17px, medium
typography.callout       // 16px, regular
typography.subhead       // 15px, regular
typography.footnote      // 13px, regular
typography.caption       // 12px, regular
typography.buttonText    // 17px, semibold, uppercase
```

### Elevation (Shadows)

```tsx
elevation.none           // No shadow
elevation.sm             // Subtle (1px offset, 0.05 opacity)
elevation.md             // Default (2px offset, 0.08 opacity) ✨
elevation.lg             // Emphasized (3px offset, 0.12 opacity)
elevation.xl             // Strong (4px offset, 0.16 opacity)
```

**Usage:**
```tsx
<View style={[styles.card, elevation.md]}>
  {/* Card content */}
</View>
```

### Animation

```tsx
animation.fast           // 150ms - Quick interactions
animation.normal         // 250ms - Standard transitions
animation.slow           // 350ms - Complex animations
animation.springConfig   // { damping: 20, stiffness: 300 }
```

**Usage:**
```tsx
Animated.timing(opacity, {
  toValue: 1,
  duration: animation.normal,
  useNativeDriver: true,
}).start();

Animated.spring(scale, {
  toValue: 1,
  ...animation.springConfig,
  useNativeDriver: true,
}).start();
```

### Spacing

```tsx
spacing.xs               // 4px
spacing.sm               // 8px
spacing.md               // 12px
spacing.lg               // 16px
spacing.xl               // 20px
spacing.xxl              // 24px
spacing.xxxl             // 32px
```

### Radius

```tsx
radius.sm                // 8px
radius.md                // 12px ✨
radius.lg                // 16px
radius.xl                // 20px
radius.full              // 9999px (circle)
```

### Layout Styles

```tsx
styles.screen            // Flex: 1, background color
styles.screenContent     // Padding + safe area
styles.screenCentered    // Centered content
styles.scrollContent     // ScrollView container padding

styles.card              // Standard card (12px radius, shadow)
styles.cardLarge         // Large card (16px radius, more shadow)
styles.cardInset         // Inset panel (no shadow)

styles.buttonPrimary     // Primary button (use PrimaryButton component instead)
styles.buttonSecondary   // Secondary button (use SecondaryButton instead)
styles.input             // Input field (use Input component instead)

styles.row               // Flex row, align center
styles.rowSpaced         // Flex row, space between
styles.center            // Center align + justify

styles.iconCircle        // 80px circle
styles.iconCircleLarge   // 96px circle ✨
styles.iconCircleSmall   // 28px circle

styles.divider           // Horizontal line
styles.section           // Section margin bottom
```

---

## 📐 Layout Patterns

### Screen Container
```tsx
<ScrollView 
  style={styles.screen} 
  contentContainerStyle={styles.scrollContent}
>
  {/* Content */}
</ScrollView>
```

### Card Layout
```tsx
<View style={[styles.cardLarge, elevation.md]}>
  <Text style={typography.title2}>Card Title</Text>
  <Text style={[typography.body, { color: colors.icon }]}>
    Card description
  </Text>
</View>
```

### Hero Section
```tsx
<View style={[styles.center, { paddingVertical: 24 }]}>
  <View style={[styles.iconCircleLarge, { backgroundColor: colors.tint + "15" }]}>
    <IconSymbol name="phone.fill" size={56} color={colors.tint} />
  </View>
  <Text style={[typography.title1, { marginTop: 20 }]}>Screen Title</Text>
  <Text style={[typography.callout, { color: colors.icon }]}>Description</Text>
</View>
```

### Form Section
```tsx
<View style={{ gap: 16 }}>
  <Input
    label="Field 1"
    value={field1}
    onChangeText={setField1}
    icon="person"
  />
  <Input
    label="Field 2"
    value={field2}
    onChangeText={setField2}
    icon="envelope"
  />
  <PrimaryButton 
    title="Submit"
    onPress={handleSubmit}
    fullWidth
    loading={isSubmitting}
  />
</View>
```

### List Item
```tsx
<Pressable style={[styles.card, styles.row]}>
  <View style={{ flex: 1 }}>
    <Text style={typography.bodyMedium}>Item Title</Text>
    <Text style={[typography.caption, { color: colors.icon }]}>
      Subtitle
    </Text>
  </View>
  <IconSymbol name="chevron.right" size={20} color={colors.icon} />
</Pressable>
```

---

## 🎯 Common Patterns

### Loading State
```tsx
{loading ? (
  <View style={[styles.screenCentered]}>
    <ActivityIndicator size="large" color={colors.tint} />
    <Text style={[typography.callout, { color: colors.icon, marginTop: 16 }]}>
      Loading...
    </Text>
  </View>
) : (
  <YourContent />
)}
```

### Empty State
```tsx
<View style={[styles.center, { flex: 1, gap: 16, padding: 24 }]}>
  <View style={[styles.iconCircle, { backgroundColor: colors.icon + "20" }]}>
    <IconSymbol name="tray" size={40} color={colors.icon} />
  </View>
  <Text style={[typography.callout, { color: colors.icon, textAlign: "center" }]}>
    No items found
  </Text>
  <PrimaryButton 
    title="Add Item"
    onPress={handleAdd}
    icon="plus"
  />
</View>
```

### Success Message
```tsx
<View style={{
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  padding: 12,
  backgroundColor: colors.successLight,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.success + "40"
}}>
  <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
  <Text style={typography.callout}>Success!</Text>
</View>
```

### Error Message
```tsx
<View style={{
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  padding: 12,
  backgroundColor: colors.errorLight,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.error + "40"
}}>
  <IconSymbol name="exclamationmark.circle.fill" size={20} color={colors.error} />
  <Text style={typography.callout}>{errorMessage}</Text>
</View>
```

---

## 🔍 Icon Reference

Common SF Symbol icons used in the app:

```tsx
// Navigation
"chevron.left"          // Back
"chevron.right"         // Forward
"xmark"                 // Close

// Actions
"plus"                  // Add
"minus"                 // Remove
"checkmark"             // Confirm
"arrow.clockwise"       // Refresh
"magnifyingglass"       // Search

// Communication
"phone.fill"            // Phone
"envelope"              // Email
"message.fill"          // Message
"square.and.arrow.up"   // Share

// Forms
"person"                // User
"lock"                  // Password
"ticket"                // Promo code
"creditcard.fill"       // Payment

// Status
"checkmark.circle.fill" // Success
"exclamationmark.circle.fill" // Error
"info.circle"           // Info

// Phone Features
"phone.badge.plus"      // Add number
"phone.down"            // No service
"phone.fill.arrow.up.right" // Outgoing
```

---

## 📱 Responsive Design

### Full Width on Mobile
```tsx
<PrimaryButton 
  title="Continue"
  onPress={handleContinue}
  fullWidth  // 100% width on all screens
/>
```

### Conditional Styling
```tsx
<View style={[
  styles.card,
  Platform.select({
    ios: elevation.md,
    android: { elevation: 3 },
  })
]}>
```

### Safe Areas
```tsx
<SafeAreaView style={{ flex: 1 }}>
  <ScrollView contentContainerStyle={styles.scrollContent}>
    {/* Content automatically respects safe area */}
  </ScrollView>
</SafeAreaView>
```

---

## ✅ Checklist for New Screens

- [ ] Import `useAppStyles` and `useColorScheme`
- [ ] Use `PrimaryButton` for main CTA
- [ ] Use `Input` for text fields with labels
- [ ] Apply `elevation.md` to cards
- [ ] Use hero section with large icon (56px)
- [ ] Follow typography scale (title1, body, etc.)
- [ ] Use `gap` instead of margins when possible
- [ ] Add loading states to buttons
- [ ] Test in light and dark mode
- [ ] Verify 44pt touch targets

---

**All components are type-safe, support light/dark mode, and include built-in animations!** 🎨
