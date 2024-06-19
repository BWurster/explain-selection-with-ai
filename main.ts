import {
	App,
	Modal,
	Plugin,
	PluginSettingTab,
	Setting,
	MarkdownRenderer,
} from "obsidian";
import OpenAI from "openai";

// Remember to rename these classes and interfaces!

interface ExplainSelectionWithAiPluginSettings {
	dropdownValue: string;
	baseURL: string;
	endpoint: string;
	apiKey: string;
}

const DEFAULT_SETTINGS: ExplainSelectionWithAiPluginSettings = {
	dropdownValue: "openai",
	baseURL: "https://api.openai.com/v1/",
	endpoint: "gpt-3.5-turbo",
	apiKey: "",
};

export default class ExplainSelectionWithAiPlugin extends Plugin {
	settings: ExplainSelectionWithAiPluginSettings;

	async onload() {
		await this.loadSettings();

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				menu.addItem((item) => {
					const selection = editor.getSelection();
					const label =
						selection.length > 24
							? selection.substring(0, 24) + "..."
							: selection;
					item.setTitle(`Expand on "${label}" in context with AI`)
						.setIcon("document")
						.onClick(async () => {
							const selection = editor.getSelection();

							const cursor = editor.getCursor();
							const lineText = editor
								.getLine(cursor.line)
								.substring(
									cursor.ch - 500 > 0 ? cursor.ch - 500 : 0,
									cursor.ch + 500 <
										editor.getLine(cursor.line).length
										? cursor.ch + 500
										: editor.getLine(cursor.line).length
								);

							const endpoint = this.settings.endpoint;

							const openai = new OpenAI({
								baseURL: this.settings.baseURL,
								apiKey: this.settings.apiKey === "" ? "-" : this.settings.apiKey,
								dangerouslyAllowBrowser: true,
							});

							const modal = new ExplainSelectionWithAiModal(
								this.app,
								openai,
								endpoint,
								selection,
								lineText,
								this
							);
							modal.open();
						});
				});
			})
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ExplainSelectionWithAiSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

export class ExplainSelectionWithAiModal extends Modal {
	userSelection: string;
	selectionContext: string;
	openai: OpenAI;
	endpoint: string;
	app: App;
	plugin: Plugin;

	constructor(
		app: App,
		openai: OpenAI,
		endpoint: string,
		userSelection: string,
		selectionContext: string,
		plugin: Plugin
	) {
		super(app);

		this.app = app;
		this.plugin = plugin;
		this.userSelection = userSelection;
		this.selectionContext = selectionContext;
		this.openai = openai;
		this.endpoint = endpoint;

		this.setTitle(userSelection);
	}

	async onOpen() {
		const { contentEl } = this;

		let rollingText = "";
		const contentBox = contentEl.createEl("div", { cls: "selectable_text" });

		try {
			// call the completion endpoint with the query context
			const completion = await this.openai.chat.completions.create({
				model: this.endpoint,
				messages: [
					{ role: "system", content: "You are a helpful assistant." },
					{
						role: "user",
						content: `Elaborate on "${this.userSelection}" in the context of "${this.selectionContext}"`,
					},
				],
				stream: true,
			});

			// render new chunks as they come in
			for await (const chunk of completion) {
				if (chunk.choices[0].delta.content) {
					rollingText += chunk.choices[0].delta.content;
					contentBox.empty();
					MarkdownRenderer.render(this.app, rollingText, contentBox, "/", this.plugin);
				}
			}
		} catch (err) {
			// set error message to be not selectable
			contentBox.toggleClass("selectable_text", false);

			// display error message for user
			const content = contentBox.createEl("p");
			content.setText("There was an issue with the request. Please ensure plugin configuration settings are correct and try again.");
			content.toggleClass("error_text", true);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class ExplainSelectionWithAiSettingTab extends PluginSettingTab {
	plugin: ExplainSelectionWithAiPlugin;

	constructor(app: App, plugin: ExplainSelectionWithAiPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("LLM provider")
			.setDesc(
				"Select the LLM provider you want to use. Currently remote OpenAI, local Ollama, and custom endpoint configurations are supported."
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption("openai", "OpenAI (remote)")
					.addOption("ollama", "Ollama (local)")
					.addOption("custom", "Custom")
					.setValue(this.plugin.settings.dropdownValue)
					.onChange(async (value) => {
						this.plugin.settings.dropdownValue = value;
						if (value === "custom") {
							this.plugin.settings.baseURL = "";
							this.plugin.settings.endpoint = "";
							this.plugin.settings.apiKey = "";
						} else if (value === "openai") {
							this.plugin.settings.baseURL = "https://api.openai.com/v1/";
							this.plugin.settings.endpoint = "gpt-3.5-turbo";
							this.plugin.settings.apiKey = "";
						} else if (value === "ollama") {
							this.plugin.settings.baseURL = "http://localhost:11434/v1/";
							this.plugin.settings.endpoint = "llama3";
							this.plugin.settings.apiKey = "";
						}
						await this.plugin.saveSettings();
						this.displayConditionalSettings(containerEl);
					})}
			);
		this.displayConditionalSettings(containerEl);
	}

	displayConditionalSettings(containerEl: HTMLElement) {
		// Clear any existing conditional settings
        const existingConditionalSettings = containerEl.querySelectorAll('.conditional-setting');
        existingConditionalSettings.forEach(setting => setting.remove());

		// Display conditional settings based on the dropdown value
        if (this.plugin.settings.dropdownValue === 'openai') {
            new Setting(containerEl)
                .setName('OpenAI model')
                .setDesc('Select the OpenAI model you want to use.')
				.addDropdown((dropdown) => {
					dropdown
						.addOption("gpt-3.5-turbo", "gpt-3.5-turbo")
						.addOption("gpt-4o", "gpt-4o")
						.addOption("gpt-4-turbo", "gpt-4-turbo")
						.setValue(this.plugin.settings.endpoint)
						.onChange(async (value) => {
							this.plugin.settings.endpoint = value;
							await this.plugin.saveSettings();
						});
                })
                .setClass('conditional-setting');
			new Setting(containerEl)
				.setName('API Key')
				.setDesc('Enter your OpenAI API key. (required)')
				.addText(text => {
					text
						.setValue(this.plugin.settings.apiKey)
						.onChange(async (value) => {
							this.plugin.settings.apiKey = value;
							await this.plugin.saveSettings();
						});
				})
				.setClass('conditional-setting');

        } else if (this.plugin.settings.dropdownValue === 'ollama') {
            new Setting(containerEl)
				.setName('Selected Ollama model')
				.setDesc('Choose the Ollama model you want to use. Make sure you have Ollama installed and running with the selected model pulled.')
				.addDropdown((dropdown) => {
					dropdown
						.addOption("llama3", "llama3")
						.addOption("mistral", "mistral")
						.setValue(this.plugin.settings.endpoint)
						.onChange(async (value) => {
							this.plugin.settings.endpoint = value;
							await this.plugin.saveSettings();
						})
				})
				.setClass('conditional-setting');

        } else if (this.plugin.settings.dropdownValue === 'custom') {
			new Setting(containerEl)
				.setName('Base URL')
				.setDesc('Enter your custom base URL.')
				.addText(text => {
					text
						.setValue(this.plugin.settings.baseURL)
						.onChange(async (value) => {
							this.plugin.settings.baseURL = value;
							await this.plugin.saveSettings();
						});
				})
				.setClass('conditional-setting');

			new Setting(containerEl)
				.setName('Endpoint')
				.setDesc('Enter your custom endpoint.')
				.addText(text => {
					text
						.setValue(this.plugin.settings.endpoint)
						.onChange(async (value) => {
							this.plugin.settings.endpoint = value;
							await this.plugin.saveSettings();
						});
				})
				.setClass('conditional-setting');

			new Setting(containerEl)
				.setName('API Key')
				.setDesc('Enter your custom API key. (Optional)')
				.addText(text => {
					text
						.setValue(this.plugin.settings.apiKey)
						.onChange(async (value) => {
							this.plugin.settings.apiKey = value;
							await this.plugin.saveSettings();
						});
				})
				.setClass('conditional-setting');
		}
	}
}
