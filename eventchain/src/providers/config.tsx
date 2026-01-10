import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mantleSepoliaTestnet } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "EvwntChain",
  projectId: "b2086c0b61d1965614aefb4fb914a316",
  chains: [mantleSepoliaTestnet],
  ssr: true,
});
