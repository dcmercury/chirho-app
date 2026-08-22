import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { useSignIn, useSignUp } from "@clerk/expo/legacy";
import { useVideoPlayer } from "expo-video";
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
} from "react-native-reanimated";
import welcome from "../../data/welcome.json";
import type { WelcomeStep } from "../../types/welcome";
import type { Community } from "../../lib/api";
import type { LovedOneGender } from "../../types/home";
import { clerkErrorMessage, joinCommunity, searchCommunities, updateAccountGender } from "../../lib/api";
import { resolveImage, video } from "../../lib/assets";
import {
  formatPhoneDisplay,
  formatPhoneInput,
  isValidPhone,
  normalizePhone,
} from "../../lib/phone";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";
import { ScreenShell } from "../ui/ScreenShell";
import { DisplayTitle } from "../ui/DisplayTitle";
import { OrangeCaption } from "../ui/OrangeCaption";
import { ChiRhoWatermark } from "../ui/ChiRhoWatermark";
import { PrayerCard } from "../ui/PrayerCard";
import { LovedOne } from "../ui/LovedOne";
import { GroupRow } from "../ui/GroupRow";
import { CommunityOption } from "../ui/CommunityOption";
import {
  CommunityResult,
  CommunitySearch,
  CommunitySelected,
} from "../ui/CommunityResult";
import { GlassInput } from "../ui/GlassInput";
import { GenderCircles } from "../ui/GenderCircles";
import { OtpInput } from "../ui/OtpInput";
import { PrimaryButton } from "../ui/PrimaryButton";
import { GhostBack } from "../ui/GhostBack";
import { ErrorBanner } from "../ui/ErrorBanner";
import { StepFooter } from "../ui/StepFooter";
import { PrivacyPolicyLink } from "../ui/PrivacyPolicyLink";

const steps = welcome.steps as WelcomeStep[];

function Enter({
  delay,
  children,
  gap,
}: {
  delay: number;
  children: ReactNode;
  gap?: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(800)
        .delay(delay)
        .easing(Easing.bezier(0.22, 1, 0.36, 1))
        .withInitialValues({
          opacity: 0,
          transform: [{ translateY: 30 }],
        })
        .reduceMotion(ReduceMotion.System)}
      style={gap ? { gap } : undefined}
    >
      {children}
    </Animated.View>
  );
}

export function OnboardingScreen({ inviteToken }: { inviteToken?: string }) {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { isSignedIn, getToken } = useAuth();
  const { signIn, isLoaded: signInLoaded, setActive } = useSignIn();
  const { signUp, isLoaded: signUpLoaded, setActive: setSignUpActive } = useSignUp();

  const [currentStep, setCurrentStep] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [bgPath, setBgPath] = useState(steps[0].backgroundImage);
  const [nextBgPath, setNextBgPath] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const [signUpMode, setSignUpMode] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState<LovedOneGender | null>(null);
  const [signUpStep, setSignUpStep] = useState<"community" | "phone">("community");
  const [joinOption, setJoinOption] = useState<"church-group" | "just-myself" | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Community | null>(null);
  const [joiningCommunity, setJoiningCommunity] = useState(false);

  const player = useVideoPlayer(video.intro, (p) => {
    p.muted = true;
    p.loop = false;
  });

  const infoSteps = steps.filter((s) => s.type === "info");
  const infoStepIndex =
    steps.slice(0, currentStep + 1).filter((s) => s.type === "info").length - 1;
  const step = steps[currentStep];
  const isSignInStep = step?.type === "signin";
  const isFirstInfoStep = step?.type === "info" && currentStep === 0;
  const hasVideo = step?.video != null;

  const goAfterAuth = useCallback(() => {
    if (inviteToken) {
      router.replace({
        pathname: "/groups/invite/[token]",
        params: { token: inviteToken },
      });
    } else {
      router.replace("/(app)");
    }
  }, [inviteToken, router]);

  useEffect(() => {
    if (isSignedIn) {
      goAfterAuth();
    }
  }, [goAfterAuth, isSignedIn]);

  useEffect(() => {
    const listener = player.addListener("playToEnd", () => setVideoEnded(true));
    return () => listener.remove();
  }, [player]);

  useEffect(() => {
    if (!hasVideo) {
      setVideoEnded(true);
      return;
    }
    setVideoEnded(false);
    player.replay();
    player.play();
  }, [currentStep, hasVideo, player]);

  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setCommunities([]);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    const timeoutId = setTimeout(async () => {
      try {
        const data = await searchCommunities(searchQuery);
        setCommunities(data.communities);
        if (data.error) setSearchError(data.error);
      } catch {
        setSearchError("Unable to connect. Please check your connection and try again.");
        setCommunities([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const goToStep = useCallback(
    (targetStep: number) => {
      if (transitioning) return;
      const nextImage = steps[targetStep].backgroundImage;
      setTransitioning(true);
      setNextBgPath(nextImage);
      setTimeout(() => {
        setBgPath(nextImage);
        setNextBgPath(null);
        setCurrentStep(targetStep);
        setTransitioning(false);
      }, 500);
    },
    [transitioning],
  );

  const handleNextStep = useCallback(() => {
    if (transitioning) return;
    let nextIdx = currentStep + 1;
    while (nextIdx < steps.length && steps[nextIdx].type === "signin") {
      nextIdx++;
    }
    if (nextIdx < steps.length) {
      goToStep(nextIdx);
    } else {
      const signUpIdx = steps.findIndex((s) => s.type === "signin");
      if (signUpIdx !== -1) {
        setSignUpMode(true);
        goToStep(signUpIdx);
      }
    }
  }, [currentStep, transitioning, goToStep]);

  const handleSignInClick = useCallback(() => {
    const signInIdx = steps.findIndex((s) => s.type === "signin");
    if (signInIdx !== -1) goToStep(signInIdx);
  }, [goToStep]);

  const handleSignUpClick = useCallback(() => {
    const signUpIdx = steps.findIndex((s) => s.type === "signin");
    if (signUpIdx === -1) return;
    setSignUpMode(true);
    goToStep(signUpIdx);
  }, [goToStep]);

  const handleInfoBack = useCallback(() => {
    if (currentStep <= 0) return;
    goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const handleBackFromSignIn = useCallback(() => {
    goToStep(0);
    setPendingVerification(false);
    setOtpCode("");
    setAuthError(null);
    setSignUpMode(false);
    setFirstName("");
    setGender(null);
    setSignUpStep("community");
    setJoinOption(null);
    setSelectedGroup(null);
    setSearchQuery("");
    setCommunities([]);
    setSearchError(null);
  }, [goToStep]);

  const handleSendCode = async () => {
    if (submittingRef.current) return;
    if (!signIn || !signInLoaded) {
      setAuthError("Sign in is still connecting. Please try again.");
      return;
    }
    setAuthenticating(true);
    setAuthError(null);
    submittingRef.current = true;
    try {
      const normalized = normalizePhone(phoneNumber);
      if (!normalized) throw new Error("Invalid phone number format");
      const result = await signIn.create({ identifier: normalized });
      const phoneCodeFactor = result.supportedFirstFactors?.find(
        (factor) => factor.strategy === "phone_code",
      );
      if (phoneCodeFactor && "phoneNumberId" in phoneCodeFactor) {
        await signIn.prepareFirstFactor({
          strategy: "phone_code",
          phoneNumberId: phoneCodeFactor.phoneNumberId,
        });
        setPendingVerification(true);
      } else {
        throw new Error("Phone verification not available for this account");
      }
    } catch (err) {
      setAuthError(clerkErrorMessage(err, "Failed to send code. Please try again."));
    } finally {
      setAuthenticating(false);
      submittingRef.current = false;
    }
  };

  const handleVerifyOtp = async () => {
    if (submittingRef.current || !signIn || !signInLoaded) return;
    setAuthenticating(true);
    setAuthError(null);
    submittingRef.current = true;
    try {
      if (otpCode.length !== 6) throw new Error("Please enter the 6-digit code");
      const result = await signIn.attemptFirstFactor({
        strategy: "phone_code",
        code: otpCode,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        goAfterAuth();
      } else {
        throw new Error("Verification incomplete");
      }
    } catch (err) {
      setAuthError(clerkErrorMessage(err, "Invalid code. Please try again."));
      setAuthenticating(false);
      submittingRef.current = false;
    }
  };

  const handleJoin = async () => {
    if (!selectedGroup) return;
    setJoiningCommunity(true);
    setAuthError(null);
    try {
      const token = await getToken();
      if (!token) {
        goAfterAuth();
        return;
      }
      await joinCommunity(selectedGroup.uuid, token);
      goAfterAuth();
    } catch (err) {
      setAuthError(clerkErrorMessage(err, "Failed to join community. Please try again."));
      setJoiningCommunity(false);
    }
  };

  const handleSignUp = async () => {
    if (submittingRef.current || !signUp || !signUpLoaded) return;
    setAuthenticating(true);
    setAuthError(null);
    submittingRef.current = true;
    try {
      if (!pendingVerification) {
        if (!phoneNumber.trim()) throw new Error("Please enter your phone number");
        const normalized = normalizePhone(phoneNumber);
        if (!normalized) throw new Error("Invalid phone number format");
        try {
          await signUp.create({
            phoneNumber: normalized,
            firstName: firstName.trim() || undefined,
          });
          await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
          setPendingVerification(true);
        } catch (signUpErr: unknown) {
          const code = (signUpErr as { errors?: { code?: string }[] })?.errors?.[0]
            ?.code;
          if (code === "form_identifier_exists") {
            await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
            setPendingVerification(true);
          } else {
            throw signUpErr;
          }
        }
      } else {
        if (otpCode.length !== 6) throw new Error("Please enter the 6-digit code");
        const result = await signUp.attemptPhoneNumberVerification({ code: otpCode });
        if (result.status === "complete") {
          await setSignUpActive({ session: result.createdSessionId });
          if (gender) {
            try {
              await new Promise((r) => setTimeout(r, 500));
              const token = await getToken();
              if (token) await updateAccountGender(gender, token);
            } catch {
              // Account gender can be set later in Profile.
            }
          }
          if (selectedGroup) {
            await new Promise((r) => setTimeout(r, 500));
            await handleJoin();
          } else {
            goAfterAuth();
          }
          return;
        }
        throw new Error("Verification incomplete");
      }
    } catch (err) {
      setAuthError(clerkErrorMessage(err, "Failed to sign up. Please try again."));
    } finally {
      setAuthenticating(false);
      submittingRef.current = false;
    }
  };

  useEffect(() => {
    if (pendingVerification && otpCode.length === 6 && !authenticating && !submittingRef.current) {
      const timer = setTimeout(() => {
        if (submittingRef.current) return;
        if (signUpMode) handleSignUp();
        else handleVerifyOtp();
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode, pendingVerification, authenticating, signUpMode]);

  const renderInfo = () => (
    <View key={currentStep}>
      <Enter delay={200}>
        {step.logo ? <ChiRhoWatermark /> : null}
        <DisplayTitle title={step.title} subtitle={step.subtitle} />
      </Enter>
      <Enter delay={400}>
        <OrangeCaption>{step.description}</OrangeCaption>
        {step.cards ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
            style={styles.extras}
          >
            {step.cards.map((card, i) => (
              <PrayerCard key={i} card={card} />
            ))}
          </ScrollView>
        ) : null}
        {step.lovedOnes ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railWide}
            style={styles.extras}
          >
            {step.lovedOnes.map((person, i) => (
              <LovedOne key={i} person={person} />
            ))}
          </ScrollView>
        ) : null}
        {step.groups ? (
          <View style={[styles.extras, styles.groupList]}>
            {step.groups.map((group, i) => (
              <GroupRow key={i} group={group} />
            ))}
          </View>
        ) : null}
      </Enter>
    </View>
  );

  const renderSignUp = () => {
    if (signUpStep === "community" && !selectedGroup) {
      if (!joinOption) {
        return (
          <Enter delay={200} gap={16}>
            <View style={styles.stack}>
            <DisplayTitle title="Get Started" subtitle="Sign Up" />
            <View style={styles.optionCol}>
              <CommunityOption
                icon="church"
                title="Join a church prayer group"
                description="Connect with a local community"
                onPress={() => setJoinOption("church-group")}
              />
              <CommunityOption
                icon="heart"
                title="Stay Independent"
                description="Personal prayer"
                onPress={() => {
                  setJoinOption("just-myself");
                  setSignUpStep("phone");
                }}
              />
            </View>
            </View>
          </Enter>
        );
      }
      return (
        <Enter delay={200} gap={16}>
          <DisplayTitle title="Find" subtitle="Your Church" />
          <CommunitySearch
            query={searchQuery}
            onChangeQuery={setSearchQuery}
            searching={isSearching}
          />
          {searchQuery.trim().length > 0 ? (
            <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
              {isSearching && communities.length === 0 ? (
                <Text style={styles.status}>Searching...</Text>
              ) : null}
              {!isSearching && searchError ? (
                <Text style={styles.searchError}>{searchError}</Text>
              ) : null}
              {!isSearching && !searchError && communities.length === 0 ? (
                <Text style={styles.status}>No communities found</Text>
              ) : null}
              {communities.map((community) => (
                <CommunityResult
                  key={community.uuid}
                  community={community}
                  onPress={() => setSelectedGroup(community)}
                />
              ))}
            </ScrollView>
          ) : null}
          <View style={{ marginTop: 8 }}>
            <GhostBack
              onPress={() => {
                setJoinOption(null);
                setSearchQuery("");
                setCommunities([]);
                setSearchError(null);
              }}
            />
          </View>
        </Enter>
      );
    }

    if (signUpStep === "community" && selectedGroup) {
      return (
        <Enter delay={200} gap={16}>
          <DisplayTitle title="Confirm" subtitle="Your Church" />
          <CommunitySelected
            name={selectedGroup.name}
            location={selectedGroup.location}
            onChange={() => {
              setSelectedGroup(null);
              setSearchQuery("");
              setCommunities([]);
            }}
          />
          <PrimaryButton label="Continue" onPress={() => setSignUpStep("phone")} />
        </Enter>
      );
    }

    if (!pendingVerification) {
      return (
        <Enter delay={200} gap={16}>
          <DisplayTitle title="Get Started" subtitle="Sign Up" />
          {selectedGroup ? (
            <CommunitySelected
              name={selectedGroup.name}
              location={selectedGroup.location}
            />
          ) : null}
          <OrangeCaption>
            Enter your name and phone number to create your account.
          </OrangeCaption>
          <GlassInput
            value={firstName}
            onChangeText={(v) =>
              setFirstName(v.replace(/[^\p{L}\s'-]/gu, ""))
            }
            placeholder="First Name"
            autoFocus
            autoCapitalize="words"
            autoComplete="given-name"
            textContentType="givenName"
          />
          {firstName.trim() ? (
            <GenderCircles onChange={setGender} value={gender} />
          ) : null}
          <GlassInput
            value={phoneNumber}
            onChangeText={(v) => {
              setPhoneNumber(formatPhoneInput(v));
              setAuthError(null);
            }}
            placeholder="(555) 000-0000"
            keyboardType="phone-pad"
            maxLength={14}
          />
          {authError ? <ErrorBanner message={authError} /> : null}
          <PrimaryButton
            label={authenticating ? "Sending code..." : "Sign Up"}
            onPress={handleSignUp}
            disabled={
              authenticating ||
              !isValidPhone(phoneNumber) ||
              (Boolean(firstName.trim()) && !gender)
            }
            loading={authenticating}
          />
          <PrivacyPolicyLink style={styles.legal} />
          <GhostBack
            onPress={() => {
              setSignUpStep("community");
              setAuthError(null);
            }}
          />
        </Enter>
      );
    }

    return (
      <Enter delay={200} gap={16}>
        <DisplayTitle title="Verify" subtitle="Your Phone" />
        <Text style={styles.helper}>
          Enter the 6-digit code sent to {formatPhoneDisplay(phoneNumber)}
        </Text>
        <OtpInput
          value={otpCode}
          onChangeText={(v) => {
            setOtpCode(v);
            setAuthError(null);
          }}
          disabled={authenticating}
        />
        {authError ? <ErrorBanner message={authError} /> : null}
        <PrimaryButton
          label={
            authenticating || joiningCommunity
              ? joiningCommunity
                ? "Joining..."
                : "Verifying..."
              : "Verify & Sign Up"
          }
          onPress={handleSignUp}
          disabled={authenticating || otpCode.length !== 6}
          loading={authenticating || joiningCommunity}
        />
        <Pressable
          disabled={authenticating}
          onPress={async () => {
            if (!signUp) return;
            setAuthenticating(true);
            try {
              await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
              setAuthError(null);
            } catch (err) {
              setAuthError(clerkErrorMessage(err, "Failed to resend code"));
            } finally {
              setAuthenticating(false);
            }
          }}
        >
          <Text style={styles.resend}>
            {authenticating ? "Sending..." : "Resend code"}
          </Text>
        </Pressable>
      </Enter>
    );
  };

  const renderSignIn = () => (
    <Enter delay={200} gap={16}>
      <DisplayTitle title={step.title} subtitle={step.subtitle} />
      {!pendingVerification ? (
        <>
          <OrangeCaption>{step.description}</OrangeCaption>
          <GlassInput
            value={phoneNumber}
            onChangeText={(v) => {
              setPhoneNumber(formatPhoneInput(v));
              setAuthError(null);
            }}
            placeholder="(555) 000-0000"
            keyboardType="phone-pad"
            maxLength={14}
            autoFocus
          />
          {authError ? <ErrorBanner message={authError} /> : null}
          <PrimaryButton
            label={
              !signInLoaded
                ? "Connecting..."
                : authenticating
                  ? "Sending code..."
                  : "Send Code"
            }
            onPress={handleSendCode}
            disabled={authenticating || !signInLoaded || !isValidPhone(phoneNumber)}
            loading={authenticating}
          />
          <PrivacyPolicyLink style={styles.legal} />
        </>
      ) : (
        <>
          <Text style={styles.helper}>
            Enter the 6-digit code sent to {formatPhoneDisplay(phoneNumber)}
          </Text>
          <OtpInput
            value={otpCode}
            onChangeText={(v) => {
              setOtpCode(v);
              setAuthError(null);
            }}
            disabled={authenticating}
          />
          {authError ? <ErrorBanner message={authError} /> : null}
          <PrimaryButton
            label={authenticating ? "Verifying..." : "Verify & Sign In"}
            onPress={handleVerifyOtp}
            disabled={authenticating || otpCode.length !== 6}
            loading={authenticating}
          />
          <Pressable
            disabled={authenticating}
            onPress={async () => {
              if (!signIn) return;
              setAuthenticating(true);
              try {
                const phoneCodeFactor = signIn.supportedFirstFactors?.find(
                  (f) => f.strategy === "phone_code",
                );
                if (phoneCodeFactor && "phoneNumberId" in phoneCodeFactor) {
                  await signIn.prepareFirstFactor({
                    strategy: "phone_code",
                    phoneNumberId: phoneCodeFactor.phoneNumberId,
                  });
                }
                setAuthError(null);
              } catch (err) {
                setAuthError(clerkErrorMessage(err, "Failed to resend code"));
              } finally {
                setAuthenticating(false);
              }
            }}
          >
            <Text style={styles.resend}>
              {authenticating ? "Sending..." : "Resend code"}
            </Text>
          </Pressable>
        </>
      )}
    </Enter>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenShell
        background={resolveImage(bgPath)}
        nextBackground={nextBgPath ? resolveImage(nextBgPath) : null}
        overlayOpacity={step?.overlayOpacity ?? 0.6}
        player={player}
        videoVisible={hasVideo}
        videoFaded={videoEnded}
        header={
          !isSignInStep ? (
            <Pressable
              onPress={handleSignUpClick}
              style={({ pressed }) => [
                styles.signUp,
                pressed && { transform: [{ scale: 1.05 }] },
              ]}
            >
              <Text style={styles.signUpText}>Sign Up</Text>
            </Pressable>
          ) : null
        }
        footer={
          <StepFooter
            variant={isSignInStep ? "auth" : "info"}
            dots={infoSteps.length}
            activeDot={infoStepIndex}
            footerLabel={signUpMode && isSignInStep ? "Sign Up" : step.footerLabel}
            isFirstInfoStep={isFirstInfoStep}
            onNext={handleNextStep}
            onSignIn={handleSignInClick}
            onBack={isSignInStep ? handleBackFromSignIn : handleInfoBack}
          />
        }
      >
        {!isSignInStep
          ? renderInfo()
          : signUpMode
            ? renderSignUp()
            : renderSignIn()}
      </ScreenShell>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  stack: {
    gap: 16,
  },
  extras: {
    marginTop: 20,
  },
  rail: {
    gap: 12,
    paddingBottom: 8,
  },
  railWide: {
    gap: 16,
    paddingBottom: 8,
  },
  groupList: {
    gap: 10,
  },
  optionCol: {
    gap: 10,
  },
  results: {
    maxHeight: 200,
    marginTop: 8,
    gap: 8,
  },
  status: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    padding: 8,
    fontFamily: fonts.body,
  },
  searchError: {
    fontSize: 12,
    color: colors.error,
    textAlign: "center",
    padding: 8,
    fontFamily: fonts.body,
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
    fontFamily: fonts.body,
    marginBottom: 4,
  },
  resend: {
    color: colors.muted,
    fontSize: 12,
    textDecorationLine: "underline",
    fontFamily: fonts.body,
    textAlign: "center",
    width: "100%",
    paddingVertical: 4,
  },
  legal: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    fontFamily: fonts.body,
  },
  signUp: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  signUpText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.displayMedium,
  },
  });
}
