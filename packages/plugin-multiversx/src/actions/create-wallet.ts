import {
    elizaLogger,
    type ActionExample,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    generateObject,
    composeContext,
    type Action,
} from "@elizaos/core";
import { WalletCreationProvider } from "../providers/WalletCreationProvider";
import { validateMultiversxConfig } from "../environment";
import { createWalletSchema } from "../utils/schemas";

// Interface for wallet creation content
export interface CreateWalletContent extends Content {
    walletName?: string;
    walletType?: string;
}

// Template for wallet creation request
const createWalletTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "walletName": "MyWallet",
    "walletType": "MultiversX"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested wallet creation:
- Wallet name (if specified)
- Wallet type (if specified, default to MultiversX)

Respond with a JSON markdown block containing only the extracted values.`;

export default {
    name: "CREATE_WALLET",
    // Daha geniş ve daha açık similes listesi
    similes: [
        "GENERATE_WALLET",
        "NEW_WALLET", 
        "NEED_WALLET",
        "CREATE_WALLET",
        "MAKE_WALLET",
        "BUILD_WALLET",
        "I NEED A WALLET",
        "I WANT A WALLET",
        "GIVE ME A WALLET",
        "CREATE A WALLET",
        "WALLET CREATION",
        "MULTIVERSX WALLET",
        "NEW MVX WALLET",
        "CREATE MVX WALLET",
        "I NEED A CRYPTO WALLET"
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.log("Validating config for wallet creation for user:", message.userId);
        try {
            await validateMultiversxConfig(runtime);
            return true;
        } catch (error) {
            // Wallet creation can proceed even if validation fails
            elizaLogger.warn("MultiversX config validation failed, but proceeding with wallet creation:", error);
            return true;
        }
    },
    description: "Create a new cryptocurrency wallet.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting CREATE_WALLET handler...");
        elizaLogger.log("User message:", message.content?.text);

        // Initialize or update state
        let currentState: State;
        if (!state) {
            currentState = (await runtime.composeState(message)) as State;
        } else {
            currentState = await runtime.updateRecentMessageState(state);
        }

        // Compose wallet creation context
        const walletContext = composeContext({
            state: currentState,
            template: createWalletTemplate,
        });

        // Generate wallet content
        const content = await generateObject({
            runtime,
            context: walletContext,
            modelClass: ModelClass.SMALL,
            schema: createWalletSchema,
        });

        const payload = content.object as CreateWalletContent;
        elizaLogger.log("Extracted wallet data:", payload);

        // Validation is minimal since both fields are optional
        try {
            elizaLogger.log("Creating new wallet with extracted data:", payload);
            
            // Create a new wallet using WalletCreationProvider
            const walletProvider = new WalletCreationProvider();
            
            // Create new wallet with the extracted parameters and save to .env
            const wallet = await walletProvider.createWallet({
                name: payload.walletName || "MyWallet",
                type: payload.walletType || "MultiversX",
                saveToEnv: true // .env dosyasına kaydet
            });
            
            // Log created wallet information (excluding sensitive data)
            elizaLogger.log("Wallet created successfully");
            elizaLogger.log("Wallet Address:", wallet.address);
            elizaLogger.log("Public Key:", wallet.publicKey);
            elizaLogger.log("Saved to .env:", wallet.savedToEnv ? "Yes" : "No");
            
            // Format mnemonic words for display (array to string)
            const mnemonicString = wallet.mnemonic.join(" ");
            
            // Entegrasyon mesajı
            const integrationMessage = wallet.savedToEnv 
                ? "I've successfully integrated this wallet with my system. All future transactions will be performed using this wallet."
                : "Your wallet has been created, but I couldn't integrate it with my system. You may need to manually set the MVX_PRIVATE_KEY variable in .env file.";
            
            // Response to be returned to the user
            const responseText = `
Your new wallet has been successfully created!

📋 Wallet Address: ${wallet.address}
🔑 Public Key: ${wallet.publicKey}
🔐 Private Key: ${wallet.privateKey}
📝 Mnemonic Words: ${mnemonicString}

${integrationMessage}

⚠️ IMPORTANT: Keep your Private Key and Mnemonic words in a secure place. 
Do not share this information with anyone and do not lose it. This information 
provides full access to your wallet and cannot be recovered.
`;

            if (callback) {
                callback({
                    text: responseText,
                    content: {
                        walletAddress: wallet.address,
                        publicKey: wallet.publicKey,
                        privateKey: wallet.privateKey,
                        mnemonic: mnemonicString,
                        savedToEnv: wallet.savedToEnv
                    },
                });
            }
            
            return true;
        } catch (error) {
            elizaLogger.error("Error during wallet creation:", error);
            if (callback) {
                callback({
                    text: `Error creating wallet: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a new wallet for me",
                    action: "CREATE_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully created wallet and integrated it with my system.",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I need a MultiversX wallet named MyTrading",
                    action: "CREATE_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully created wallet and integrated it with my system.",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you create a wallet for me?",
                    action: "CREATE_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully created wallet and integrated it with my system.",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want a new crypto wallet",
                    action: "CREATE_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully created wallet and integrated it with my system.",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;