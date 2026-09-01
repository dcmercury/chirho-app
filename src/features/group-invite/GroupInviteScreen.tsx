import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useAuth } from "@clerk/expo";
import { useSignUp } from "@clerk/expo/legacy";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
} from "react-native-reanimated";
import { ChiRhoMark } from "../../components/ui/ChiRhoMark";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { GlassInput } from "../../components/ui/GlassInput";
import { OtpInput } from "../../components/ui/OtpInput";
import { PrivacyPolicyLink } from "../../components/ui/PrivacyPolicyLink";
import { SignupConsentControls } from "../../components/ui/SignupConsentControls";
import {
  GroupInviteApiError,
  acceptGroupInvitation,
  declineGroupInvitation,
  getGroupInvitation,
  updateGroupPrayerCategories,
  type GroupInvitation,
  type GroupInviteScripture,
} from "../../lib/groupInviteApi";
import { buildSignupConsentMetadata } from "../../lib/legalConsent";
import { formatPhoneDisplay, formatPhoneInput, isValidPhone, lastFourDigits, normalizePhone } from "../../lib/phone";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { InviteBackground } from "./InviteBackground";
import { InviteFooter } from "./InviteFooter";

const PRAYER_CATEGORIES = [
  { id: "home", label: "Home" },
  { id: "work", label: "Work" },
  { id: "school", label: "School" },
  { id: "health", label: "Health" },
  { id: "family", label: "Family" },
  { id: "friends", label: "Friends" },
  { id: "church", label: "Church" },
  { id: "finances", label: "Finances" },
] as const;

type InviteStep =
  | { kind: "invitation" }
  | { kind: "scripture"; scripture: GroupInviteScripture | null; index: number }
  | { kind: "categories" }
  | { kind: "summary" };

type LoadErrorKind = "expired" | "not-found" | "retry";

interface LoadError {
  kind: LoadErrorKind;
  message: string;
}

function Enter({
  children,
  delay,
}: {
  children: ReactNode;
  delay: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(520)
        .delay(delay)
        .easing(Easing.bezier(0.22, 1, 0.36, 1))
        .withInitialValues({
          opacity: 0,
          transform: [{ translateY: 16 }],
        })
        .reduceMotion(ReduceMotion.System)}
    >
      {children}
    </Animated.View>
  );
}

function buildSteps(invitation: GroupInvitation): InviteStep[] {
  const scriptures = (invitation.scriptureReferences || []).filter(
    (scripture) => scripture.citation || scripture.text || scripture.reason,
  );
  return [
    { kind: "invitation" },
    ...(scriptures.length
      ? scriptures.map(
          (scripture, index): InviteStep => ({
            kind: "scripture",
            scripture,
            index,
          }),
        )
      : [{ kind: "scripture", scripture: null, index: 0 } as InviteStep]),
    { kind: "categories" },
    { kind: "summary" },
  ];
}

function clerkErrorCode(error: unknown): string | undefined {
  return (error as { errors?: { code?: string }[] })?.errors?.[0]?.code;
}

function clerkErrorMessage(error: unknown, fallback: string): string {
  const clerkError = error as {
    errors?: { longMessage?: string; message?: string }[];
    message?: string;
  };
  return (
    clerkError.errors?.[0]?.longMessage ||
    clerkError.errors?.[0]?.message ||
    clerkError.message ||
    fallback
  );
}

export function GroupInviteScreen({ token }: { token: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const {
    signUp,
    isLoaded: signUpLoaded,
    setActive: setSignUpActive,
  } = useSignUp();

  const [invitation, setInvitation] = useState<GroupInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [aiProcessingAllowed, setAiProcessingAllowed] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [requiresExistingAccountSignIn, setRequiresExistingAccountSignIn] =
    useState(false);
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  const steps = useMemo(
    () => (invitation ? buildSteps(invitation) : []),
    [invitation],
  );
  const step = steps[activeStep];
  const isFinalStep = activeStep === steps.length - 1;
  const clerkReady = authLoaded && (isSignedIn || signUpLoaded);

  const loadInvitation = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) {
        setLoadError({
          kind: "not-found",
          message: "This invitation link is missing its token.",
        });
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const result = await getGroupInvitation(token, signal);
        if (new Date(result.expiresAt).getTime() < Date.now()) {
          setLoadError({
            kind: "expired",
            message: "Please contact the group leader for a new invitation.",
          });
          setInvitation(null);
          return;
        }
        setInvitation(result);
        setActiveStep(0);
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        if (error instanceof GroupInviteApiError && error.status === 410) {
          setLoadError({
            kind: "expired",
            message: "Please contact the group leader for a new invitation.",
          });
        } else if (
          error instanceof GroupInviteApiError &&
          error.status === 404
        ) {
          setLoadError({
            kind: "not-found",
            message: "This invitation may have been removed or already used.",
          });
        } else {
          setLoadError({
            kind: "retry",
            message:
              error instanceof Error
                ? error.message
                : "Unable to load this invitation.",
          });
        }
        setInvitation(null);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadInvitation(controller.signal);
    return () => controller.abort();
  }, [loadInvitation]);

  const waitForSessionToken = useCallback(async (): Promise<string> => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const sessionToken = await getToken();
      if (sessionToken) return sessionToken;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error("Your account was created, but the session is still starting.");
  }, [getToken]);

  const completeAcceptance = useCallback(
    async (sessionToken: string) => {
      if (!invitation) throw new Error("Invitation data is unavailable.");
      await acceptGroupInvitation(token, sessionToken);
      await updateGroupPrayerCategories(
        invitation.groupuuid,
        selectedCategories,
        sessionToken,
      );
      router.replace({
        pathname: "/(app)/groups/[groupuuid]",
        params: { groupuuid: invitation.groupuuid },
      });
    },
    [invitation, router, selectedCategories, token],
  );

  const openSecureSignIn = useCallback(() => {
    router.push({
      pathname: "/(onboarding)",
      params: {
        inviteToken: token,
        returnTo: `/groups/invite/${token}`,
      },
    });
  }, [router, token]);

  const handleDeny = useCallback(async () => {
    if (submittingRef.current || !invitation || !isSignedIn) return;
    submittingRef.current = true;
    setBusy(true);
    setAuthError(null);
    try {
      const sessionToken = await getToken();
      if (!sessionToken) throw new Error("Your session expired. Please sign in again.");
      await declineGroupInvitation(token, sessionToken);
      router.replace("/(app)");
    } catch (error) {
      setAuthError(
        clerkErrorMessage(error, "Unable to decline this invitation."),
      );
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }, [getToken, invitation, isSignedIn, router, token]);

  const handleJoin = useCallback(async () => {
    if (submittingRef.current || !invitation) return;
    if (!termsAccepted) {
      setAuthError("Please agree to the Group Policy to continue.");
      return;
    }
    if (!isSignedIn && !legalAccepted) {
      setAuthError("Please agree to the Terms of Use to continue.");
      return;
    }
    if (
      !isSignedIn &&
      requiresExistingAccountSignIn
    ) {
      openSecureSignIn();
      return;
    }
    if (!clerkReady) {
      setAuthError("Authentication is still connecting. Please try again.");
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    setAuthError(null);
    try {
      if (isSignedIn) {
        const sessionToken = await getToken();
        if (!sessionToken) throw new Error("Your session expired. Please sign in again.");
        await completeAcceptance(sessionToken);
        return;
      }

      if (!signUp || !signUpLoaded) {
        throw new Error("Sign up is still connecting. Please try again.");
      }
      if (!isValidPhone(phoneNumber)) {
        throw new Error("Enter the phone number this invitation was sent to.");
      }
      if (
        invitation.phoneLastFour &&
        lastFourDigits(phoneNumber) !== invitation.phoneLastFour
      ) {
        throw new Error(
          "Use the phone number this invitation was sent to.",
        );
      }
      const normalizedPhone = normalizePhone(phoneNumber);
      if (!normalizedPhone) {
        throw new Error("That phone number is invalid.");
      }
      try {
        await signUp.create({
          phoneNumber: normalizedPhone,
          firstName: invitation.firstName || undefined,
          unsafeMetadata: buildSignupConsentMetadata(aiProcessingAllowed),
        });
      } catch (error) {
        if (clerkErrorCode(error) === "form_identifier_exists") {
          setRequiresExistingAccountSignIn(true);
          setAuthError(null);
          return;
        }
        throw error;
      }
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
      setPendingVerification(true);
      setOtpCode("");
    } catch (error) {
      setAuthError(
        clerkErrorMessage(error, "Unable to start account verification."),
      );
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }, [
    clerkReady,
    completeAcceptance,
    getToken,
    invitation,
    isSignedIn,
    legalAccepted,
    openSecureSignIn,
    phoneNumber,
    requiresExistingAccountSignIn,
    signUp,
    signUpLoaded,
    termsAccepted,
    aiProcessingAllowed,
  ]);

  const handleVerifyOtp = useCallback(async () => {
    if (
      submittingRef.current ||
      !signUp ||
      !signUpLoaded ||
      otpCode.length !== 6
    ) {
      return;
    }
    submittingRef.current = true;
    setBusy(true);
    setAuthError(null);
    try {
      const result = await signUp.attemptPhoneNumberVerification({ code: otpCode });
      if (result.status !== "complete" || !result.createdSessionId) {
        throw new Error("Verification is incomplete. Please try again.");
      }
      await setSignUpActive({ session: result.createdSessionId });
      const sessionToken = await waitForSessionToken();
      await completeAcceptance(sessionToken);
    } catch (error) {
      setAuthError(clerkErrorMessage(error, "That code could not be verified."));
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }, [
    completeAcceptance,
    otpCode,
    setSignUpActive,
    signUp,
    signUpLoaded,
    waitForSessionToken,
  ]);

  useEffect(() => {
    if (!pendingVerification || otpCode.length !== 6 || busy) return;
    const timeout = setTimeout(handleVerifyOtp, 300);
    return () => clearTimeout(timeout);
  }, [busy, handleVerifyOtp, otpCode, pendingVerification]);

  const resendCode = useCallback(async () => {
    if (submittingRef.current || !signUp || !signUpLoaded) return;
    submittingRef.current = true;
    setBusy(true);
    setAuthError(null);
    try {
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
    } catch (error) {
      setAuthError(clerkErrorMessage(error, "Unable to resend the code."));
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }, [signUp, signUpLoaded]);

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((value) => value !== category)
        : [...current, category],
    );
  }, []);

  const goBack = useCallback(() => {
    if (busy || activeStep === 0) return;
    setAuthError(null);
    setActiveStep((current) => Math.max(0, current - 1));
  }, [activeStep, busy]);

  const goForward = useCallback(() => {
    if (busy) return;
    if (!isFinalStep) {
      setActiveStep((current) => Math.min(steps.length - 1, current + 1));
      return;
    }
    if (pendingVerification) {
      handleVerifyOtp();
    } else {
      handleJoin();
    }
  }, [
    busy,
    handleJoin,
    handleVerifyOtp,
    isFinalStep,
    pendingVerification,
    steps.length,
  ]);

  if (loading) {
    return (
      <View style={styles.root}>
        <InviteBackground />
        <View style={styles.stateCenter}>
          <ActivityIndicator color={colors.title} />
          <Text style={styles.stateHint}>Loading invitation…</Text>
        </View>
      </View>
    );
  }

  if (loadError || !invitation) {
    const title =
      loadError?.kind === "expired"
        ? "Invitation expired"
        : loadError?.kind === "not-found"
          ? "Invitation not found"
          : "Unable to connect";
    return (
      <View style={styles.root}>
        <InviteBackground />
        <View
          style={[
            styles.stateCenter,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
        >
          <ChiRhoMark width={30} height={40} color={colors.title} />
          <Text style={styles.stateLabel}>GROUP INVITATION</Text>
          <Text style={styles.stateTitle}>{title}</Text>
          <Text style={styles.stateMessage}>{loadError?.message}</Text>
          {loadError?.kind === "retry" ? (
            <Pressable
              disabled={!authLoaded || loading}
              onPress={() => loadInvitation()}
              style={({ pressed }) => [
                styles.stateButton,
                (!authLoaded || loading) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.stateButtonText}>Try again</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.back()} style={styles.stateLink}>
              <Text style={styles.stateLinkText}>Go back</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  const selectedLabels = selectedCategories.map(
    (id) => PRAYER_CATEGORIES.find((category) => category.id === id)?.label || id,
  );
  const needsSignIn = !isSignedIn && requiresExistingAccountSignIn;
  const primaryLabel = isFinalStep
    ? needsSignIn
      ? "Sign In"
      : pendingVerification
        ? "Verify & Join"
        : "Join Group"
    : "Continue";
  const primaryDisabled =
    !clerkReady ||
    (isFinalStep &&
      (pendingVerification
        ? otpCode.length !== 6
        : !termsAccepted ||
          (!isSignedIn && !legalAccepted) ||
          (!isSignedIn &&
            !requiresExistingAccountSignIn &&
            !isValidPhone(phoneNumber))));

  const renderStep = () => {
    if (!step) return null;
    if (step.kind === "invitation") {
      return (
        <View key="invitation" style={styles.stepStack}>
          <Enter delay={40}>
            <Text style={styles.heading}>
              {invitation.firstName
                ? `Welcome, ${invitation.firstName}`
                : "You’re invited"}
            </Text>
            {invitation.phoneLastFour ? (
              <Text style={styles.hint}>
                Phone ending in {invitation.phoneLastFour}
              </Text>
            ) : null}
          </Enter>
          <Enter delay={150}>
            <View style={styles.metaRow}>
              {invitation.adminName || invitation.inviterName ? (
                <View>
                  <Text style={styles.metaLabel}>LED BY</Text>
                  <Text style={styles.metaValue}>
                    {invitation.adminName || invitation.inviterName}
                  </Text>
                </View>
              ) : null}
              {typeof invitation.memberCount === "number" ? (
                <View>
                  <Text style={styles.metaLabel}>MEMBERS</Text>
                  <Text style={styles.metaValue}>{invitation.memberCount}</Text>
                </View>
              ) : null}
            </View>
          </Enter>
          <Enter delay={280}>
            <View style={styles.divider} />
            <Text style={styles.purpose}>
              {invitation.purpose ||
                invitation.description ||
                "A place to pray together, encourage one another, and grow in faith."}
            </Text>
          </Enter>
        </View>
      );
    }

    if (step.kind === "scripture") {
      return (
        <View key={`scripture-${step.index}`} style={styles.stepStack}>
          <Enter delay={40}>
            <Text style={styles.sectionLabel}>
              {step.scripture?.citation || "SCRIPTURE"}
            </Text>
          </Enter>
          <Enter delay={150}>
            <Text style={styles.scripture}>
              {step.scripture?.text ||
                "This group gathers around shared prayer, encouragement, and the hope of Scripture."}
            </Text>
          </Enter>
          {step.scripture?.reason ? (
            <Enter delay={280}>
              <View style={styles.divider} />
              <Text style={styles.metaLabel}>WHY THIS VERSE</Text>
              <Text style={styles.reason}>{step.scripture.reason}</Text>
            </Enter>
          ) : null}
        </View>
      );
    }

    if (step.kind === "categories") {
      return (
        <View key="categories" style={styles.stepStack}>
          <Enter delay={40}>
            <Text style={styles.heading}>What can we pray for?</Text>
            <Text style={styles.hint}>
              Select the areas of life you’d like your group to hold in prayer.
            </Text>
          </Enter>
          <Enter delay={170}>
            <View style={styles.tags}>
              {PRAYER_CATEGORIES.map((category) => {
                const selected = selectedCategories.includes(category.id);
                return (
                  <Pressable
                    key={category.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    disabled={busy}
                    onPress={() => toggleCategory(category.id)}
                    style={({ pressed }) => [
                      styles.tag,
                      selected && styles.tagSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                      {category.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Enter>
          <Enter delay={300}>
            <Text style={styles.hint}>
              {selectedCategories.length
                ? `${selectedCategories.length} selected`
                : "You can update these later."}
            </Text>
          </Enter>
        </View>
      );
    }

    return (
      <View key="summary" style={styles.stepStack}>
        <Enter delay={40}>
          <Text style={styles.heading}>
            {pendingVerification ? "Verify your phone" : "Ready to join"}
          </Text>
          <Text style={styles.hint}>
            {pendingVerification
              ? `Enter the code sent to ${formatPhoneDisplay(phoneNumber)}.`
              : isSignedIn
                ? "Your signed-in account will be added to this group."
                : "Confirm the invitation details below."}
          </Text>
        </Enter>

        {pendingVerification ? (
          <Enter delay={170}>
            <View style={styles.otpStack}>
              <OtpInput
                value={otpCode}
                onChangeText={(value) => {
                  setOtpCode(value);
                  setAuthError(null);
                }}
                disabled={busy}
              />
              <Pressable disabled={busy} onPress={resendCode} hitSlop={8}>
                <Text style={styles.resend}>
                  {busy ? "Sending…" : "Resend code"}
                </Text>
              </Pressable>
            </View>
          </Enter>
        ) : (
          <>
            <Enter delay={150}>
              <View style={styles.summary}>
                {invitation.firstName ? (
                  <ReadOnlyRow label="NAME" value={invitation.firstName} />
                ) : null}
                {isSignedIn ? null : (
                  <View style={styles.summaryRow}>
                    <Text style={styles.metaLabel}>PHONE</Text>
                    {invitation.phoneLastFour ? (
                      <Text style={styles.hint}>
                        Must match the number ending in {invitation.phoneLastFour}
                      </Text>
                    ) : null}
                    <GlassInput
                      value={phoneNumber}
                      onChangeText={(value) => {
                        setPhoneNumber(formatPhoneInput(value));
                        setAuthError(null);
                      }}
                      placeholder="(555) 000-0000"
                      keyboardType="phone-pad"
                      maxLength={14}
                      editable={!busy}
                    />
                  </View>
                )}
                <ReadOnlyRow label="GROUP" value={invitation.groupName} />
                {selectedLabels.length ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.metaLabel}>PRAYING FOR</Text>
                    <View style={styles.summaryTags}>
                      {selectedLabels.map((label) => (
                        <View key={label} style={[styles.tag, styles.tagSelected]}>
                          <Text style={[styles.tagText, styles.tagTextSelected]}>
                            {label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            </Enter>
            <Enter delay={240}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: termsAccepted }}
                disabled={busy}
                onPress={() => setTermsAccepted((value) => !value)}
                style={styles.terms}
              >
                <View style={styles.termsCopy}>
                  <Text style={styles.termsTitle}>Group Policy</Text>
                  <Text style={styles.termsText}>
                    I agree to pray and participate with care.
                  </Text>
                </View>
                <Switch
                  value={termsAccepted}
                  disabled={busy}
                  onValueChange={setTermsAccepted}
                  trackColor={{
                    false: colors.glassBorderHairline,
                    true: colors.accent,
                  }}
                  thumbColor={colors.white}
                />
              </Pressable>
              {isSignedIn ? (
                <PrivacyPolicyLink style={styles.legal} />
              ) : (
                <View style={styles.signupConsent}>
                  <SignupConsentControls
                    termsAccepted={legalAccepted}
                    onTermsAcceptedChange={setLegalAccepted}
                    aiProcessingAllowed={aiProcessingAllowed}
                    onAiProcessingAllowedChange={setAiProcessingAllowed}
                    disabled={busy}
                  />
                </View>
              )}
              {isSignedIn ? (
                <Pressable
                  disabled={busy}
                  onPress={handleDeny}
                  style={styles.denyAction}
                >
                  <Text style={styles.denyActionText}>Decline invitation</Text>
                </Pressable>
              ) : null}
            </Enter>
          </>
        )}

        {needsSignIn ? (
          <Enter delay={310}>
            <View style={styles.signInNotice}>
              <Text style={styles.signInTitle}>This phone already has an account</Text>
              <Text style={styles.signInText}>
                Sign in through the normal secure flow, then return to this
                invitation to join.
              </Text>
              <Pressable
                disabled={busy}
                onPress={openSecureSignIn}
                style={styles.signInAction}
              >
                <Text style={styles.signInActionText}>Open secure sign in</Text>
              </Pressable>
            </View>
          </Enter>
        ) : null}

        {authError ? (
          <Enter delay={330}>
            <ErrorBanner message={authError} />
          </Enter>
        ) : null}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <InviteBackground backgroundImage={invitation.backgroundImage} />
      <View style={[styles.content, { paddingTop: insets.top + 18 }]}>
        <View style={styles.header}>
          <Enter delay={80}>
            <View style={styles.mark}>
              <ChiRhoMark width={28} height={37} color={colors.title} />
            </View>
          </Enter>
          <Enter delay={150}>
            <Text style={styles.inviteLabel}>
              {invitation.firstName
                ? `INVITATION FOR ${invitation.firstName}`
                : "PRAYER GROUP INVITATION"}
            </Text>
          </Enter>
          <Enter delay={240}>
            <Text style={styles.title}>{invitation.groupName}</Text>
          </Enter>
        </View>

        <ScrollView
          style={styles.middle}
          contentContainerStyle={styles.middleContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>
      </View>
      <InviteFooter
        activeStep={activeStep}
        totalSteps={steps.length}
        primaryLabel={primaryLabel}
        primaryDisabled={primaryDisabled}
        busy={busy}
        onBack={goBack}
        onContinue={goForward}
      />
    </KeyboardAvoidingView>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexShrink: 0,
    minHeight: 154,
    justifyContent: "flex-end",
    paddingBottom: 16,
  },
  mark: {
    opacity: 0.14,
    marginBottom: 9,
  },
  inviteLabel: {
    color: colors.accentText,
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 7,
  },
  title: {
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -0.85,
  },
  middle: {
    flex: 1,
  },
  middleContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 18,
  },
  stepStack: {
    gap: 14,
  },
  heading: {
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  hint: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  sectionLabel: {
    color: colors.accentText,
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    gap: 32,
  },
  metaLabel: {
    color: colors.mutedGhost,
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  metaValue: {
    color: colors.mutedStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  divider: {
    width: 32,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.glassFillChip,
    marginBottom: 9,
  },
  purpose: {
    color: colors.titleMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: 14,
  },
  scripture: {
    color: colors.subtitleStrong,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    fontStyle: "italic",
  },
  reason: {
    color: colors.mutedStrong,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassBorderHairline,
    backgroundColor: colors.glassFill,
  },
  tagSelected: {
    borderColor: colors.accentBorderInvite,
    backgroundColor: colors.accentFillHeavy,
  },
  tagText: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  tagTextSelected: {
    color: colors.accentText,
  },
  summary: {
    gap: 11,
    padding: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
  },
  summaryRow: {
    gap: 2,
  },
  summaryValue: {
    color: colors.mutedStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  summaryTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 3,
  },
  terms: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  termsCopy: {
    flex: 1,
  },
  termsTitle: {
    color: colors.accentText,
    fontFamily: fonts.displayMedium,
    fontSize: 12,
  },
  termsText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  legal: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
  signupConsent: {
    marginTop: 10,
  },
  denyAction: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginTop: 4,
  },
  denyActionText: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    textDecorationLine: "underline",
  },
  otpStack: {
    gap: 12,
  },
  resend: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: "center",
    textDecorationLine: "underline",
    paddingVertical: 4,
  },
  signInNotice: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accentBorderMuted,
    backgroundColor: colors.accentFillMuted,
  },
  signInTitle: {
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 13,
  },
  signInText: {
    color: colors.mutedStrong,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  signInAction: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginTop: 4,
  },
  signInActionText: {
    color: colors.accentText,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    textDecorationLine: "underline",
  },
  stateCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  stateHint: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  stateLabel: {
    color: colors.accentText,
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    marginTop: 6,
  },
  stateTitle: {
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 28,
    textAlign: "center",
  },
  stateMessage: {
    color: colors.mutedStrong,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  stateButton: {
    minWidth: 120,
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: colors.buttonPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  stateButtonText: {
    color: colors.buttonOnPrimary,
    fontFamily: fonts.displayMedium,
    fontSize: 12,
  },
  stateLink: {
    padding: 10,
  },
  stateLinkText: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    textDecorationLine: "underline",
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.82,
  },
  });
}
