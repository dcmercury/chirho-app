import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useAuth } from "@clerk/expo";
import { Image, type ImageSource } from "expo-image";
import {
  isPrivateImagePath,
  privateImageCachePolicy,
  resolveImage,
} from "../../lib/assets";

type AuthenticatedImageProps = {
  path?: string | null;
} & Omit<ComponentProps<typeof Image>, "source">;

export function AuthenticatedImage({
  path,
  cachePolicy,
  onError,
  recyclingKey,
  ...rest
}: AuthenticatedImageProps) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const privatePath = isPrivateImagePath(path);
  const [source, setSource] = useState<ImageSource | undefined>(() =>
    privatePath ? undefined : resolveImage(path),
  );
  const [retryKey, setRetryKey] = useState(0);
  const retriedRef = useRef(false);

  useEffect(() => {
    retriedRef.current = false;
  }, [path]);

  useEffect(() => {
    if (!privatePath) {
      setSource(resolveImage(path));
      return;
    }
    let cancelled = false;
    void (async () => {
      const token = await getTokenRef.current();
      if (!cancelled) {
        setSource(resolveImage(path, token));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, privatePath, retryKey]);

  return (
    <Image
      {...rest}
      source={source}
      cachePolicy={cachePolicy ?? privateImageCachePolicy(path)}
      recyclingKey={privatePath ? `${path}-${retryKey}` : recyclingKey}
      onError={(event) => {
        if (privatePath && !retriedRef.current) {
          retriedRef.current = true;
          setRetryKey((key) => key + 1);
        }
        onError?.(event);
      }}
    />
  );
}
