import { useCallback, useState } from "react"

import type { ProviderSettings } from "@roo-code/types"

import { useExtensionState } from "@src/context/ExtensionStateContext"
import { validateApiConfiguration } from "@src/utils/validate"
import { vscode } from "@src/utils/vscode"
import { useAppTranslation } from "@src/i18n/TranslationContext"
import { Button } from "@src/components/ui"

import ApiOptions from "../settings/ApiOptions"
import { Tab, TabContent } from "../common/Tab"

import RooHero from "./RooHero"
import { Trans } from "react-i18next"

const WelcomeViewProvider = () => {
	const { apiConfiguration, currentApiConfigName, setApiConfiguration, uriScheme } = useExtensionState()
	const { t } = useAppTranslation()
	const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)

	// Memoize the setApiConfigurationField function to pass to ApiOptions
	const setApiConfigurationFieldForApiOptions = useCallback(
		<K extends keyof ProviderSettings>(field: K, value: ProviderSettings[K]) => {
			setApiConfiguration({ [field]: value })
		},
		[setApiConfiguration], // setApiConfiguration from context is stable
	)

	const handleFinish = useCallback(() => {
		const error = apiConfiguration ? validateApiConfiguration(apiConfiguration) : undefined

		if (error) {
			setErrorMessage(error)
			return
		}

		setErrorMessage(undefined)
		vscode.postMessage({ type: "upsertApiConfiguration", text: currentApiConfigName, apiConfiguration })
	}, [apiConfiguration, currentApiConfigName])

	return (
		<Tab>
			<TabContent className="flex flex-col gap-4 p-6 justify-center">
				<RooHero />
				<h2 className="mt-0 mb-0 text-xl">{t("welcome:landing.greeting")}</h2>

				<div className="space-y-4 leading-normal">
					<p className="text-base text-vscode-foreground">
						<Trans i18nKey="welcome:landing.introduction" />
					</p>
				</div>

				<div>
					<ApiOptions
						fromWelcomeView
						apiConfiguration={apiConfiguration || {}}
						uriScheme={uriScheme}
						setApiConfigurationField={setApiConfigurationFieldForApiOptions}
						errorMessage={errorMessage}
						setErrorMessage={setErrorMessage}
					/>
				</div>

				<div className="flex gap-2">
					<Button onClick={handleFinish} variant="primary">
						{t("welcome:providerSignup.finish")} →
					</Button>
				</div>

				<div>
					<button
						onClick={() => vscode.postMessage({ type: "importSettings" })}
						className="cursor-pointer bg-transparent border-none p-0 text-vscode-foreground hover:underline">
						{t("welcome:importSettings")}
					</button>
				</div>
			</TabContent>
		</Tab>
	)
}

export default WelcomeViewProvider
