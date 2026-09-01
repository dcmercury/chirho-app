import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, type ColorTokens } from "../../../../theme/tokens";
import { useTheme, useThemedStyles } from "../../../../theme/ThemeProvider";
import { GlassInput } from "../../../../components/ui/GlassInput";
import type { GroupScripture } from "../../types";
import { PlusIcon, SparkleIcon } from "../Icons";
import {
  GroupDrawerError,
  GroupDrawerSection,
} from "./GroupDrawerControls";

interface GroupPurposeSectionProps {
  purpose: string | null;
  purposeDraft: string;
  purposeEditing: boolean;
  scriptures: GroupScripture[];
  scriptureFormOpen: boolean;
  scriptureDraft: GroupScripture;
  canRegenerate: boolean;
  purposePending: boolean;
  addPending: boolean;
  regeneratePending: boolean;
  purposeError?: string;
  scriptureError?: string;
  isRemovePending: (index: number) => boolean;
  onBeginPurposeEdit: () => void;
  onCancelPurposeEdit: () => void;
  onPurposeDraftChange: (value: string) => void;
  onSavePurpose: () => void;
  onOpenScriptureForm: () => void;
  onCloseScriptureForm: () => void;
  onScriptureDraftChange: (value: GroupScripture) => void;
  onAddScripture: () => void;
  onRemoveScripture: (index: number, citation: string) => void;
  onRegenerate: () => void;
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    headingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    headingActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    label: {
      color: colors.mutedStrong,
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
    },
    purpose: {
      color: colors.mutedStrong,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 19,
      paddingVertical: 4,
    },
    empty: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      fontStyle: "italic",
    },
    purposeInput: {
      minHeight: 104,
    },
    verseInput: {
      minHeight: 82,
    },
    reasonInput: {
      minHeight: 68,
    },
    formActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 7,
    },
    smallAction: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      paddingHorizontal: 11,
    },
    smallActionText: {
      color: colors.mutedStrong,
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
    },
    saveButton: {
      minHeight: 36,
      borderRadius: 18,
      backgroundColor: colors.buttonPrimary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
    },
    saveText: {
      color: colors.buttonOnPrimary,
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
    },
    scriptureHeader: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    scripture: {
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorderSoft,
      paddingVertical: 10,
      gap: 5,
    },
    scriptureTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    citation: {
      flex: 1,
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 13,
    },
    verse: {
      color: colors.mutedStrong,
      fontFamily: fonts.body,
      fontSize: 11,
      fontStyle: "italic",
      lineHeight: 17,
    },
    reason: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 10,
      lineHeight: 15,
    },
    remove: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 10,
    },
    form: {
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorderSoft,
      paddingTop: 12,
    },
    disabled: {
      opacity: 0.4,
    },
  });
}

export function GroupPurposeSection({
  purpose,
  purposeDraft,
  purposeEditing,
  scriptures,
  scriptureFormOpen,
  scriptureDraft,
  canRegenerate,
  purposePending,
  addPending,
  regeneratePending,
  purposeError,
  scriptureError,
  isRemovePending,
  onBeginPurposeEdit,
  onCancelPurposeEdit,
  onPurposeDraftChange,
  onSavePurpose,
  onOpenScriptureForm,
  onCloseScriptureForm,
  onScriptureDraftChange,
  onAddScripture,
  onRemoveScripture,
  onRegenerate,
}: GroupPurposeSectionProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const addDisabled =
    addPending ||
    !scriptureDraft.citation.trim() ||
    !scriptureDraft.text.trim();

  return (
    <GroupDrawerSection title="Purpose and scripture">
      <View style={styles.headingRow}>
        <Text style={styles.label}>Group purpose</Text>
        <View style={styles.headingActions}>
          {!purposeEditing ? (
            <SmallAction
              label="Edit purpose"
              onPress={onBeginPurposeEdit}
              text="Edit"
            />
          ) : null}
          {canRegenerate ? (
            <SmallAction
              busy={regeneratePending}
              disabled={regeneratePending}
              icon={<SparkleIcon color={colors.accent} size={13} />}
              label="Regenerate purpose and scripture"
              onPress={onRegenerate}
              text={regeneratePending ? "Regenerating…" : "Regenerate"}
            />
          ) : null}
        </View>
      </View>

      {purposeEditing ? (
        <>
          <GlassInput
            accessibilityLabel="Group purpose"
            editable={!purposePending}
            multiline
            onChangeText={onPurposeDraftChange}
            placeholder="This group's purpose is to…"
            style={styles.purposeInput}
            textAlignVertical="top"
            value={purposeDraft}
          />
          <View style={styles.formActions}>
            <SmallAction
              disabled={purposePending}
              label="Cancel purpose changes"
              onPress={onCancelPurposeEdit}
              text="Cancel"
            />
            <Pressable
              accessibilityLabel="Save group purpose"
              accessibilityRole="button"
              accessibilityState={{
                disabled: purposePending,
                busy: purposePending,
              }}
              disabled={purposePending}
              onPress={onSavePurpose}
              style={[styles.saveButton, purposePending && styles.disabled]}
            >
              <Text style={styles.saveText}>
                {purposePending ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Text style={[styles.purpose, !purpose && styles.empty]}>
          {purpose || "No purpose set yet."}
        </Text>
      )}
      <GroupDrawerError message={purposeError} />

      <View style={styles.scriptureHeader}>
        <Text style={styles.label}>Scripture references</Text>
        {!scriptureFormOpen ? (
          <SmallAction
            icon={<PlusIcon color={colors.mutedStrong} size={13} />}
            label="Add scripture reference"
            onPress={onOpenScriptureForm}
            text="Add"
          />
        ) : null}
      </View>

      {scriptures.length ? (
        scriptures.map((scripture, index) => {
          const removing = isRemovePending(index);
          return (
            <View key={`${scripture.citation}-${index}`} style={styles.scripture}>
              <View style={styles.scriptureTitleRow}>
                <Text style={styles.citation}>{scripture.citation}</Text>
                <Pressable
                  accessibilityLabel={`Remove ${scripture.citation || "scripture"}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: removing, busy: removing }}
                  disabled={removing}
                  onPress={() => onRemoveScripture(index, scripture.citation)}
                  style={removing && styles.disabled}
                >
                  <Text style={styles.remove}>
                    {removing ? "Removing…" : "Remove"}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.verse}>{scripture.text}</Text>
              {scripture.reason ? (
                <Text style={styles.reason}>{scripture.reason}</Text>
              ) : null}
            </View>
          );
        })
      ) : (
        <Text style={styles.empty}>No scripture references yet.</Text>
      )}

      {scriptureFormOpen ? (
        <View style={styles.form}>
          <GlassInput
            accessibilityLabel="Scripture citation"
            autoCapitalize="words"
            editable={!addPending}
            onChangeText={(citation) =>
              onScriptureDraftChange({ ...scriptureDraft, citation })
            }
            placeholder="Citation *"
            value={scriptureDraft.citation}
          />
          <GlassInput
            accessibilityLabel="Scripture verse text"
            editable={!addPending}
            multiline
            onChangeText={(text) =>
              onScriptureDraftChange({ ...scriptureDraft, text })
            }
            placeholder="Verse text *"
            style={styles.verseInput}
            textAlignVertical="top"
            value={scriptureDraft.text}
          />
          <GlassInput
            accessibilityLabel="Why this scripture matters"
            editable={!addPending}
            multiline
            onChangeText={(reason) =>
              onScriptureDraftChange({ ...scriptureDraft, reason })
            }
            placeholder="Why this verse matters (optional)"
            style={styles.reasonInput}
            textAlignVertical="top"
            value={scriptureDraft.reason || ""}
          />
          <View style={styles.formActions}>
            <SmallAction
              disabled={addPending}
              label="Cancel adding scripture"
              onPress={onCloseScriptureForm}
              text="Cancel"
            />
            <Pressable
              accessibilityLabel="Add scripture reference"
              accessibilityRole="button"
              accessibilityState={{ disabled: addDisabled, busy: addPending }}
              disabled={addDisabled}
              onPress={onAddScripture}
              style={[styles.saveButton, addDisabled && styles.disabled]}
            >
              <Text style={styles.saveText}>
                {addPending ? "Adding…" : "Add scripture"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <GroupDrawerError message={scriptureError} />
    </GroupDrawerSection>
  );
}

function SmallAction({
  text,
  label,
  icon,
  disabled,
  busy,
  onPress,
}: {
  text: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  busy?: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.smallAction, disabled && styles.disabled]}
    >
      {icon}
      <Text style={styles.smallActionText}>{text}</Text>
    </Pressable>
  );
}
