import {
	App,
	Modal,
	Plugin,
	PluginSettingTab,
	Setting,
	Notice,
} from "obsidian";
import OpenAI from "openai";

// Remember to rename these classes and interfaces!

interface AiElaboratePluginSettings {
	endpoint: string;
	apiKey: string;
}

const DEFAULT_SETTINGS: AiElaboratePluginSettings = {
	endpoint: "",
	apiKey: "",
};

export default class AiElaboratePlugin extends Plugin {
	settings: AiElaboratePluginSettings;

	async onload() {
		await this.loadSettings();

		const openai = new OpenAI({
			apiKey: this.settings.apiKey,
			dangerouslyAllowBrowser: true,
		});

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
							view.file && new Notice(view.file.path);
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

							const modal = new AiExpandModal(
								this.app,
								openai,
								endpoint,
								selection,
								lineText
							);
							modal.open();
						});
				});
			})
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
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

export class AiExpandModal extends Modal {
	userSelection: string;
	selectionContext: string;
	openai: OpenAI;
	endpoint: string;

	constructor(
		app: App,
		openai: OpenAI,
		endpoint: string,
		userSelection: string,
		selectionContext: string
	) {
		super(app);

		this.userSelection = userSelection;
		this.selectionContext = selectionContext;
		this.openai = openai;
		this.endpoint = endpoint;

		this.setTitle(userSelection);
	}

	async onOpen() {
		let { contentEl } = this;

		let rollingText = "";
		const content = contentEl.createEl("p", { text: rollingText });

		try {
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

			content.style.userSelect = "text";

			for await (const chunk of completion) {
				if (chunk.choices[0].delta.content) {
					rollingText += chunk.choices[0].delta.content;
					content.innerHTML = rollingText;
				}
			}
		} catch (err) {
			content.innerHTML = "There was an issue with the request. Please ensure plugin configuration settings are correct and try again.";
			content.style.color = "white";
			content.style.fontStyle = "italic";
			content.style.backgroundColor = "red";
			content.style.borderRadius = "10px";
			content.style.padding = "10px";
		}
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: AiElaboratePlugin;

	constructor(app: App, plugin: AiElaboratePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("AI Endpoint")
			.setDesc(
				"Enter the endpoint you would like to be used for expanding on selected items."
			)
			.addText((text) =>
				text
					.setPlaceholder("https://example.com/chat")
					.setValue(this.plugin.settings.endpoint)
					.onChange(async (value) => {
						this.plugin.settings.endpoint = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Endpoint API Key")
			.setDesc(
				"(Optional) Enter your secret API key for the endpoint above."
			)
			.addText((text) =>
				text
					.setPlaceholder("Secret key")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
