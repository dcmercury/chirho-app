import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { fonts, type as typography, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { Stagger } from "../../features/groups/components/Stagger";
import { WizardBackdrop } from "../ui/WizardBackdrop";
import { GlassInput } from "../ui/GlassInput";
import { resolveImage } from "../../lib/assets";
import { useBackgroundLibrary } from "../../lib/backgroundLibrary";
import { prepareLovedOnePhoto } from "../../lib/lovedOnePhoto";
import { PlusIcon, SparkleIcon } from "../../features/groups/components/Icons";
import type {
  GroupCreatePayload,
  GroupPreviewPayload,
  GroupPreviewResult,
  GroupScripture,
} from "../../features/groups/types";
import {
  GROUP_WIZARD_STEP_COUNT,
  groupWizardBackStep,
  groupWizardCanOpenStep,
  groupWizardCrumbs,
  groupWizardDotIndex,
  groupWizardHasContext,
  groupWizardHasFocus,
  groupWizardHasType,
  groupWizardMissingStep,
  groupWizardNameValid,
  groupWizardStepIdForDot,
  humanizeWizardId,
  initialGroupFlow,
  nameSuggestionsForFlow,
  resolveWizardStep,
  type GroupCreationFlowData,
} from "../../lib/groupCreationWizard";

export function CreateGroupModal({
  visible,
  saving,
  error,
  dismissLabel = "Cancel",
  onClose,
  onGeneratePreview,
  onSubmit,
}: {
  visible: boolean;
  saving: boolean;
  error: string | null;
  dismissLabel?: string;
  onClose: () => void;
  onGeneratePreview: (
    input: GroupPreviewPayload,
  ) => Promise<GroupPreviewResult>;
  onSubmit: (input: GroupCreatePayload) => Promise<void>;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [flow, setFlow] = useState<GroupCreationFlowData>(initialGroupFlow);
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [scriptures, setScriptures] = useState<GroupScripture[]>([]);
  const [generating, setGenerating] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<string[]>([]);
  const [backgroundUploads, setBackgroundUploads] = useState<
    { uri: string; imageData: string }[]
  >([]);
  const [generateBackground, setGenerateBackground] = useState(false);
  const { urls: libraryUrls } = useBackgroundLibrary();
  const [pickingBackground, setPickingBackground] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const step = resolveWizardStep(flow.step);
  const dotIndex = groupWizardDotIndex(flow.step);
  const isPreview = flow.step === "step6_preview";
  const isNaming = flow.step === "step4_naming";
  const isMultiSelect = step?.type === "multi_select";
  const suggestions = useMemo(() => nameSuggestionsForFlow(flow), [flow]);

  useEffect(() => {
    if (!visible) {
      setFlow(initialGroupFlow());
      setSelectedContexts([]);
      setSelectedFocuses([]);
      setGroupName("");
      setPurpose("");
      setScriptures([]);
      setGenerating(false);
      setPreviewError(null);
      setSelectedBackgrounds([]);
      setBackgroundUploads([]);
      setGenerateBackground(false);
      setPickingBackground(false);
      setStepError(null);
    }
  }, [visible]);

  useEffect(() => {
    if (flow.step.startsWith("step2_")) {
      setSelectedContexts(flow.contexts || []);
    }
    if (flow.step.startsWith("step3_")) {
      setSelectedFocuses(flow.selectedFocuses || []);
    }
    if (flow.step === "step4_naming") {
      setGroupName(flow.groupName || "");
    }
  }, [flow.step, flow.contexts, flow.selectedFocuses, flow.groupName]);

  useEffect(() => {
    if (!visible || !isPreview) return;
    const missing = groupWizardMissingStep(flow);
    if (missing) {
      jumpTo(missing);
      return;
    }
    if (purpose.trim()) return;
    void generatePreview();
    // Generate only when the preview step first needs content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isPreview]);

  const generatePreview = async () => {
    if (
      !flow.groupType ||
      !groupWizardHasContext(flow) ||
      !groupWizardHasFocus(flow)
    ) {
      return;
    }
    setGenerating(true);
    setPreviewError(null);
    try {
      const result = await onGeneratePreview({
        groupType: flow.groupType,
        contexts: flow.contexts || [],
        focuses: flow.selectedFocuses || [],
      });
      setPurpose(result.purpose);
      setScriptures(result.scriptureReferences);
    } catch (err) {
      setPreviewError(
        err instanceof Error
          ? err.message
          : "Unable to generate purpose and scripture.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const jumpTo = (targetStep: string) => {
    if (saving || generating || targetStep === flow.step) return;
    const movingAhead =
      groupWizardDotIndex(targetStep) > groupWizardDotIndex(flow.step);
    if (movingAhead && !groupWizardCanOpenStep(flow, targetStep)) {
      setStepError("Finish this step before continuing.");
      return;
    }
    setPreviewError(null);
    setStepError(null);
    setFlow((current) => {
      if (targetStep === "step1") return initialGroupFlow();
      if (targetStep.startsWith("step2_")) {
        return {
          ...current,
          step: targetStep,
          step2Id: targetStep,
          contexts: undefined,
          step3Id: undefined,
          selectedFocuses: undefined,
          groupName: undefined,
        };
      }
      if (targetStep.startsWith("step3_")) {
        return {
          ...current,
          step: targetStep,
          step3Id: targetStep,
          selectedFocuses: undefined,
          groupName: undefined,
        };
      }
      return { ...current, step: targetStep };
    });
    if (targetStep !== "step6_preview" && targetStep !== "step4_naming") {
      setPurpose("");
      setScriptures([]);
    }
  };

  const goBack = () => {
    const previous = groupWizardBackStep(flow);
    if (!previous) {
      onClose();
      return;
    }
    jumpTo(previous);
  };

  const selectSingleOption = (optionId: string, nextStep: string) => {
    if (!optionId || !nextStep) return;
    setStepError(null);
    if (flow.step === "step1") {
      setFlow({
        step: nextStep,
        groupType: optionId,
        step2Id: nextStep,
      });
      return;
    }
    if (flow.step.startsWith("step2_")) {
      setFlow({
        ...flow,
        step: nextStep,
        contexts: [optionId],
        step3Id: nextStep,
        selectedFocuses: undefined,
        groupName: undefined,
      });
    }
  };

  const continueMultiSelect = () => {
    if (!step) return;
    const validIds = (step.options || [])
      .map((option) => option.id)
      .filter((id) => selectedIds.includes(id));
    if (!validIds.length) {
      setStepError("Pick at least one.");
      return;
    }
    setStepError(null);
    if (flow.step.startsWith("step2_")) {
      const first = step.options?.find((option) => validIds.includes(option.id));
      if (!first?.next) return;
      setFlow({
        ...flow,
        step: first.next,
        contexts: validIds,
        step3Id: first.next,
        selectedFocuses: undefined,
        groupName: undefined,
      });
      return;
    }
    if (flow.step.startsWith("step3_")) {
      setFlow({
        ...flow,
        step: step.next || "step4_naming",
        selectedFocuses: validIds,
        groupName: undefined,
      });
    }
  };

  const continueNaming = () => {
    if (!groupWizardNameValid(groupName)) {
      setStepError("Name this group (3–50 characters).");
      return;
    }
    if (
      !groupWizardHasType(flow) ||
      !groupWizardHasContext(flow) ||
      !groupWizardHasFocus(flow)
    ) {
      const missing = groupWizardMissingStep({
        ...flow,
        groupName: groupName.trim(),
      });
      setStepError("Finish the earlier steps first.");
      if (missing && missing !== "step4_naming") jumpTo(missing);
      return;
    }
    setStepError(null);
    setPurpose("");
    setScriptures([]);
    setFlow({
      ...flow,
      step: "step6_preview",
      groupName: groupName.trim(),
    });
  };

  const handleCreate = () => {
    if (saving || generating) return;
    const missing = groupWizardMissingStep(flow);
    if (missing) {
      setStepError("Finish the earlier steps first.");
      jumpTo(missing);
      return;
    }
    if (!purpose.trim()) {
      setPreviewError("Add a group purpose to continue.");
      return;
    }
    const name = flow.groupName?.trim() || "";
    void onSubmit({
      name,
      description: name,
      purpose: purpose.trim(),
      scriptureReferences: scriptures.filter(
        (item) => item.citation.trim() && item.text.trim(),
      ),
      creationMetadata: {
        groupType: flow.groupType || "",
        contexts: flow.contexts || [],
        focuses: flow.selectedFocuses || [],
      },
      backgroundUrls: selectedBackgrounds.filter((url) =>
        libraryUrls.includes(url),
      ),
      backgroundUploads: selectedBackgrounds
        .map(
          (url) =>
            backgroundUploads.find((item) => item.uri === url)?.imageData,
        )
        .filter((item): item is string => Boolean(item)),
      generateBackground,
    });
  };

  const backgroundImages = useMemo(
    () => [...libraryUrls, ...backgroundUploads.map((item) => item.uri)],
    [backgroundUploads, libraryUrls],
  );

  const toggleBackground = (url: string) => {
    setSelectedBackgrounds((current) =>
      current.includes(url)
        ? current.filter((item) => item !== url)
        : [...current, url],
    );
  };

  const pickBackground = async () => {
    if (saving || pickingBackground) return;
    setPickingBackground(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const imageData = await prepareLovedOnePhoto(asset);
      setBackgroundUploads((current) => [
        ...current,
        { uri: asset.uri, imageData },
      ]);
      setSelectedBackgrounds((current) =>
        current.includes(asset.uri) ? current : [...current, asset.uri],
      );
    } catch (err) {
      setPreviewError(
        err instanceof Error
          ? err.message
          : "Photos could not be opened. Please try again.",
      );
    } finally {
      setPickingBackground(false);
    }
  };

  const backgroundSource = (url: string) => {
    if (url.startsWith("/") || /^https?:\/\//.test(url)) {
      return resolveImage(url);
    }
    return { uri: url };
  };

  const toggleValue = (
    current: string[],
    value: string,
    setter: (next: string[]) => void,
  ) => {
    setter(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const selectedIds = flow.step.startsWith("step2_")
    ? selectedContexts
    : selectedFocuses;
  const canContinueMulti = selectedIds.length > 0;
  const canPreview = Boolean(
    groupWizardHasType(flow) &&
      groupWizardHasContext(flow) &&
      groupWizardHasFocus(flow) &&
      groupWizardNameValid(groupName),
  );
  const canCreate = Boolean(
    !groupWizardMissingStep(flow) && purpose.trim() && !saving && !generating,
  );
  const displayError = stepError || previewError || error;
  const crumbs = groupWizardCrumbs(flow);

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={saving || generating ? undefined : onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <WizardBackdrop />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>PRAYER GROUPS</Text>
          <View style={styles.dots}>
            {Array.from({ length: GROUP_WIZARD_STEP_COUNT }).map((_, index) => {
              const target = groupWizardStepIdForDot(flow, index);
              const reached = index <= dotIndex;
              return (
                <Pressable
                  key={index}
                  accessibilityLabel={`Step ${index + 1}`}
                  accessibilityRole="button"
                  disabled={!reached || index === dotIndex || saving || generating}
                  hitSlop={8}
                  onPress={() => {
                    if (target && index < dotIndex) jumpTo(target);
                  }}
                  style={[
                    styles.dot,
                    reached && styles.dotReached,
                    index === dotIndex && styles.dotActive,
                  ]}
                />
              );
            })}
          </View>
          {crumbs.length ? (
            <View style={styles.crumbs}>
              {crumbs.map((crumb, index) => {
                const last = index === crumbs.length - 1;
                return (
                  <View
                    key={crumb.id}
                    style={[
                      styles.crumbItem,
                      last ? styles.crumbItemLast : styles.crumbItemEarly,
                    ]}
                  >
                    {index > 0 ? <Text style={styles.crumbSep}>→</Text> : null}
                    <Pressable
                      accessibilityRole="button"
                      disabled={saving || generating}
                      onPress={() => jumpTo(crumb.id)}
                      style={styles.crumbTouch}
                    >
                      <Text style={styles.crumb} numberOfLines={1}>
                        {crumb.label}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}
          <View key={flow.step}>
            <Stagger delay={80}>
              <Text style={styles.title}>{step?.title || "Start a group"}</Text>
            </Stagger>
            {step?.subtitle ? (
              <Stagger delay={180}>
                <Text style={styles.subtitle}>{step.subtitle}</Text>
              </Stagger>
            ) : null}
            <Stagger delay={280}>

          {step?.options?.length ? (
            <View
              style={[
                styles.options,
                step.type === "single_select" &&
                  flow.step === "step1" &&
                  styles.optionsStack,
              ]}
            >
              {step.options.map((option) => {
                const isRow = flow.step === "step1";
                const active = isMultiSelect && selectedIds.includes(option.id);
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole={isRow ? "radio" : "button"}
                    accessibilityState={{ selected: active }}
                    disabled={saving}
                    onPress={() => {
                      if (isMultiSelect) {
                        toggleValue(
                          selectedIds,
                          option.id,
                          flow.step.startsWith("step2_")
                            ? setSelectedContexts
                            : setSelectedFocuses,
                        );
                        return;
                      }
                      if (option.next) selectSingleOption(option.id, option.next);
                    }}
                    style={[
                      styles.option,
                      isRow && styles.optionRow,
                      active && styles.optionActive,
                    ]}
                  >
                    {isRow ? <View style={styles.radio} /> : null}
                    <View style={isRow ? styles.optionCopy : undefined}>
                      <Text
                        style={[
                          styles.optionText,
                          isRow && styles.optionRowText,
                          active && styles.optionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {option.examples?.length ? (
                        <Text style={styles.optionMeta}>
                          {option.examples.join(" · ")}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {isNaming ? (
            <>
              {suggestions.length ? (
                <View style={styles.options}>
                  {suggestions.map((suggestion) => {
                    const active = groupName === suggestion;
                    return (
                      <Pressable
                        key={suggestion}
                        disabled={saving}
                        onPress={() => setGroupName(suggestion)}
                        style={[styles.option, active && styles.optionActive]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            active && styles.optionTextActive,
                          ]}
                        >
                          {suggestion}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              <GlassInput
                accessibilityLabel="Group name"
                editable={!saving}
                onChangeText={setGroupName}
                placeholder={
                  step?.custom_field?.placeholder || "Name this prayer group"
                }
                maxLength={50}
                style={styles.input}
                value={groupName}
              />
            </>
          ) : null}

          {isPreview ? (
            generating ? (
              <View style={styles.generating}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.generatingText}>
                  Finding a group purpose and Bible verses…
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.summary}>
                  <SummaryRow
                    label="Name"
                    last={!flow.groupType && !flow.contexts?.length}
                    value={flow.groupName || ""}
                  />
                  {flow.groupType ? (
                    <SummaryRow
                      label="Type"
                      last={!flow.contexts?.length}
                      value={humanizeWizardId(flow.groupType)}
                    />
                  ) : null}
                  {flow.contexts?.length ? (
                    <SummaryRow
                      last
                      label="Context"
                      value={flow.contexts.map(humanizeWizardId).join(", ")}
                    />
                  ) : null}
                </View>
                <View style={styles.previewHeader}>
                  <Text style={styles.label}>GROUP PURPOSE</Text>
                  <Pressable
                    disabled={saving || generating}
                    onPress={() => {
                      setPurpose("");
                      void generatePreview();
                    }}
                    style={styles.regen}
                  >
                    <Text style={styles.regenText}>Regenerate</Text>
                  </Pressable>
                </View>
                <GlassInput
                  editable={!saving}
                  multiline
                  onChangeText={setPurpose}
                  placeholder="This group's purpose is to…"
                  style={[styles.input, styles.purposeInput]}
                  value={purpose}
                />
                <Text style={styles.label}>SCRIPTURE</Text>
                {scriptures.length ? (
                  scriptures.map((scripture, index) => (
                    <View
                      key={`${scripture.citation}-${index}`}
                      style={[
                        styles.verse,
                        index === scriptures.length - 1 && styles.verseLast,
                      ]}
                    >
                      <View style={styles.previewHeader}>
                        <Text style={styles.citation}>{scripture.citation}</Text>
                        <Pressable
                          disabled={saving}
                          onPress={() =>
                            setScriptures((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                        >
                          <Text style={styles.removeText}>Remove</Text>
                        </Pressable>
                      </View>
                      <Text style={styles.verseText}>{scripture.text}</Text>
                      {scripture.reason ? (
                        <Text style={styles.reason}>{scripture.reason}</Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.empty}>No scripture yet. Regenerate to try again.</Text>
                )}
                <Text style={[styles.label, styles.backgroundLabel]}>
                  GROUP BACKGROUND
                </Text>
                <Text style={styles.backgroundCopy}>
                  Tap scenes to include them in the fade. Numbers show the order.
                  Upload your own or generate a new image from the group’s purpose.
                </Text>
                <View style={styles.thumbs}>
                  {backgroundImages.map((url) => {
                    const order = selectedBackgrounds.indexOf(url);
                    const selected = order >= 0;
                    return (
                      <Pressable
                        key={url}
                        accessibilityLabel={
                          selected
                            ? `Remove background ${order + 1}`
                            : "Add this background to the fade"
                        }
                        accessibilityRole="button"
                        accessibilityState={{ selected, disabled: saving }}
                        disabled={saving}
                        onPress={() => toggleBackground(url)}
                        style={[
                          styles.thumb,
                          selected && styles.thumbSelected,
                          saving && styles.disabled,
                        ]}
                      >
                        <Image
                          contentFit="cover"
                          source={backgroundSource(url)}
                          style={styles.thumbImage}
                        />
                        {selected ? (
                          <View style={styles.orderBadge}>
                            <Text style={styles.orderText}>{order + 1}</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                  <Pressable
                    accessibilityLabel="Upload a background photo"
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: saving || pickingBackground,
                      busy: pickingBackground,
                    }}
                    disabled={saving || pickingBackground}
                    onPress={() => void pickBackground()}
                    style={[
                      styles.thumb,
                      styles.upload,
                      (saving || pickingBackground) && styles.disabled,
                    ]}
                  >
                    <PlusIcon color={colors.mutedSoft} size={14} />
                  </Pressable>
                </View>
                <Pressable
                  accessibilityLabel="Generate group background"
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: generateBackground,
                    disabled: saving,
                  }}
                  disabled={saving}
                  onPress={() => setGenerateBackground((current) => !current)}
                  style={[
                    styles.generate,
                    generateBackground && styles.generateSelected,
                    saving && styles.disabled,
                  ]}
                >
                  <SparkleIcon color={colors.accent} size={14} />
                  <Text style={styles.generateText}>
                    {generateBackground
                      ? "Will generate after create"
                      : "Generate"}
                  </Text>
                </Pressable>
              </>
            )
          ) : null}

            </Stagger>
            <Stagger delay={400}>
          {displayError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {displayError}
            </Text>
          ) : null}

          {isMultiSelect ? (
            <>
              {!canContinueMulti ? (
                <Text style={styles.hint}>Pick at least one to continue.</Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canContinueMulti || saving }}
                disabled={!canContinueMulti || saving}
                onPress={continueMultiSelect}
                style={[
                  styles.submit,
                  (!canContinueMulti || saving) && styles.disabled,
                ]}
              >
                <Text style={styles.submitText}>Continue</Text>
              </Pressable>
            </>
          ) : null}

          {isNaming && !groupWizardNameValid(groupName) ? (
            <Text style={styles.hint}>Name this group (3–50 characters).</Text>
          ) : null}

          {isNaming ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canPreview || saving }}
              disabled={!canPreview || saving}
              onPress={continueNaming}
              style={[styles.submit, (!canPreview || saving) && styles.disabled]}
            >
              <Text style={styles.submitText}>Preview with AI</Text>
            </Pressable>
          ) : null}

          {isPreview && !generating ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: !canCreate,
              }}
              disabled={!canCreate}
              onPress={handleCreate}
              style={[
                styles.submit,
                !canCreate && styles.disabled,
              ]}
            >
              <Text style={styles.submitText}>
                {saving ? "Creating…" : "Create group"}
              </Text>
            </Pressable>
          ) : null}
            </Stagger>
          </View>

          <View style={styles.actions}>
            {flow.step !== "step1" ? (
              <Pressable
                accessibilityRole="button"
                disabled={saving || generating}
                onPress={goBack}
                style={[
                  styles.secondary,
                  styles.backButton,
                  (saving || generating) && styles.disabled,
                ]}
              >
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={onClose}
              style={[
                styles.secondary,
                saving && styles.disabled,
              ]}
            >
              <Text style={styles.cancelText}>{dismissLabel}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SummaryRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.summaryRow, last && styles.summaryRowLast]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    content: { padding: 24, paddingBottom: 64 },
    handle: {
      alignSelf: "center",
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.glassBorderStrong,
      marginBottom: 24,
    },
    eyebrow: {
      ...typography.labelSm,
      color: colors.muted,
      marginBottom: 10,
    },
    dots: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 12,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.glassBorderStrong,
    },
    dotReached: {
      backgroundColor: colors.accent,
    },
    dotActive: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    crumbs: {
      flexDirection: "row",
      flexWrap: "nowrap",
      alignItems: "center",
      marginBottom: 16,
    },
    crumbItem: {
      flexDirection: "row",
      alignItems: "center",
      minWidth: 0,
    },
    crumbItemEarly: {
      flexShrink: 1,
      flexGrow: 0,
    },
    crumbItemLast: {
      flexShrink: 0,
    },
    crumbTouch: {
      minHeight: 28,
      minWidth: 0,
      justifyContent: "center",
    },
    crumb: {
      color: colors.accentText,
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      flexShrink: 1,
    },
    crumbSep: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      marginHorizontal: 6,
      flexShrink: 0,
    },
    title: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 27,
      marginBottom: 3,
    },
    subtitle: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 16,
      marginBottom: 24,
    },
    options: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginBottom: 8,
    },
    optionsStack: { flexDirection: "column", gap: 0 },
    option: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minWidth: "47%",
      flexGrow: 1,
    },
    optionRow: {
      minWidth: "100%",
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 0,
      borderWidth: 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorderSoft,
      backgroundColor: "transparent",
      paddingHorizontal: 0,
      paddingVertical: 10,
    },
    radio: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.glassBorderLoud,
    },
    optionCopy: { flex: 1, minWidth: 0 },
    optionActive: {
      backgroundColor: colors.accentFillPill,
      borderColor: colors.accentBorderPill,
    },
    optionText: {
      color: colors.mutedSoft,
      fontFamily: fonts.body,
      fontSize: 11,
    },
    optionRowText: {
      color: colors.title,
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
    },
    optionTextActive: { color: colors.accentText },
    optionMeta: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 10,
      marginTop: 3,
    },
    input: {
      marginBottom: 8,
    },
    purposeInput: {
      minHeight: 104,
      paddingTop: 10,
      textAlignVertical: "top",
    },
    previewHeader: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    label: { ...typography.labelSm, color: colors.muted },
    regen: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    regenText: {
      color: colors.accentText,
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
    },
    summary: {
      marginBottom: 28,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.glassBorder,
    },
    summaryRow: {
      minHeight: 48,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorderSoft,
    },
    summaryRowLast: { borderBottomWidth: 0 },
    summaryLabel: {
      ...typography.caption,
      color: colors.muted,
      fontFamily: fonts.body,
    },
    summaryValue: {
      ...typography.caption,
      color: colors.mutedStrong,
      fontFamily: fonts.body,
      flexShrink: 1,
      textAlign: "right",
      marginLeft: 16,
    },
    verse: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorderSoft,
    },
    verseLast: { borderBottomWidth: 0 },
    citation: {
      color: colors.title,
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
    },
    verseText: {
      color: colors.mutedStrong,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },
    reason: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 6,
    },
    empty: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 12,
      marginBottom: 12,
    },
    backgroundLabel: { marginTop: 28 },
    backgroundCopy: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 10,
      marginBottom: 12,
    },
    thumbs: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    thumb: {
      width: 56,
      height: 56,
      borderRadius: 10,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.glassBorderMuted,
      backgroundColor: colors.groupFill,
    },
    thumbSelected: {
      borderColor: colors.accentBorderFocus,
      borderWidth: 2,
    },
    thumbImage: {
      width: "100%",
      height: "100%",
    },
    orderBadge: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    orderText: {
      color: colors.white,
      fontFamily: fonts.monoMedium,
      fontSize: 9,
      lineHeight: 11,
    },
    upload: {
      alignItems: "center",
      justifyContent: "center",
      borderStyle: "dashed",
    },
    generate: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    generateSelected: {
      borderColor: colors.accentBorderPill,
      backgroundColor: colors.accentFillPill,
    },
    generateText: {
      color: colors.mutedStrong,
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
    },
    generating: {
      alignItems: "center",
      paddingVertical: 36,
      gap: 10,
    },
    generatingText: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 12,
      textAlign: "center",
    },
    hint: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      marginTop: 16,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 11,
      marginTop: 12,
    },
    submit: {
      minHeight: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.buttonPrimary,
      marginTop: 24,
    },
    submitText: {
      color: colors.buttonOnPrimary,
      fontFamily: fonts.displayMedium,
      fontSize: 14,
    },
    actions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    secondary: {
      flex: 1,
      minHeight: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.glassBorderLoud,
      alignItems: "center",
      justifyContent: "center",
    },
    backButton: {
      borderColor: colors.accentBorderPill,
      backgroundColor: colors.accentFillPill,
    },
    backText: {
      color: colors.accentText,
      fontFamily: fonts.displayMedium,
      fontSize: 12,
    },
    cancelText: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 12,
    },
    disabled: { opacity: 0.4 },
    removeText: { color: colors.error, fontFamily: fonts.body, fontSize: 11 },
  });
}
