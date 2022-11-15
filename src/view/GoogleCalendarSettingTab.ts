import type { Template } from "../helper/types";
import GoogleCalendarPlugin from "src/GoogleCalendarPlugin";
import { createNotice } from "src/helper/NoticeHelper";
import {
	PluginSettingTab,
	App,
	Setting,
	Notice,
	Platform,
} from "obsidian";
import { LoginGoogle } from "../googleApi/GoogleAuth";
import { getRefreshToken, getUserId, setAccessToken, setExpirationTime, setRefreshToken, setUserId } from "../helper/LocalStorage";
import { googleListCalendars } from "../googleApi/GoogleListCalendars";
import { FileSuggest } from "../suggest/FileSuggest";
import { FolderSuggest } from "../suggest/FolderSuggester";

export class GoogleCalendarSettingTab extends PluginSettingTab {
	plugin: GoogleCalendarPlugin;

	constructor(app: App, plugin: GoogleCalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		const isLoggedIn = (getRefreshToken() || getUserId());

		containerEl.empty();

		containerEl.createEl("h2", { text: "Settings for Google Calendar" });
		containerEl.createEl("h4", { text: "Please restart Obsidian to let changes take effect"})
		
		new Setting(containerEl)
			.setName("Use own authentication client")
			.setDesc("Please create your own client.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useCustomClient)
					.onChange(async (value) => {
						this.plugin.settings.useCustomClient = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

	if(this.plugin.settings.useCustomClient){

		new Setting(containerEl)
			.setName("ClientId")
			.setDesc("Google client id")
			.setClass("SubSettings")
			.addText((text) =>
				text
					.setPlaceholder("Enter your client id")
					.setValue(this.plugin.settings.googleClientId)
					.onChange(async (value) => {
						this.plugin.settings.googleClientId = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("ClientSecret")
			.setDesc("Google client secret")
			.setClass("SubSettings")
			.addText((text) =>
				text
					.setPlaceholder("Enter your client secret")
					.setValue(this.plugin.settings.googleClientSecret)
					.onChange(async (value) => {
						this.plugin.settings.googleClientSecret = value;
						await this.plugin.saveSettings();
					})
			);

		if (Platform.isMobileApp) {
			new Setting(containerEl)
				.setName("Refresh Token")
				.setDesc("Google Refresh Token from OAuth")
				.setClass("SubSettings")
				.addText((text) =>
					text
						.setPlaceholder("Enter refresh token")
						.setValue(this.plugin.settings.googleRefreshToken)
						.onChange(async (value) => {
							this.plugin.settings.googleRefreshToken = value;
							setRefreshToken(value);
						})
				);
		}
	}else{

		new Setting(containerEl)
		.setName("Serverurl")
		.setDesc("The url to the server where the oauth takes place")
		.setClass("SubSettings")
		.addText(text => {
			text
			.setValue(this.plugin.settings.googleOAuthServer)
			.onChange(async (value) => {
				this.plugin.settings.googleOAuthServer = value;
				await this.plugin.saveSettings();
			})
		})

	}

	new Setting(containerEl)
		.setName("Login with google")
		.addButton(button => {
			button
			.setButtonText(isLoggedIn ? "Logout" : "Login")
			.onClick(() => {
				if(isLoggedIn){
					setRefreshToken("");
					setUserId("");
					setAccessToken("");
					setExpirationTime(0);
					this.hide();
					this.display();
				}else{
					if(this.plugin.settings.useCustomClient){
						LoginGoogle()
					}else{
						window.open(`${this.plugin.settings.googleOAuthServer}/api/google`)
					}
				}
			})
		})

		new Setting(containerEl)
			.setName("Refresh Interval")
			.setDesc("Time in seconds between refresh request from google server")
			.addSlider(cb => {
				cb.setValue(this.plugin.settings.refreshInterval)
				cb.setLimits(10, 360, 1);
				cb.setDynamicTooltip();
				cb.onChange(async value => {
					this.plugin.settings.refreshInterval = value;
					await this.plugin.saveSettings();
			})
		});
		
		new Setting(containerEl)
		.setName("Default webview theme")
		.addDropdown(async (dropdown) => {
			dropdown.addOption("auto", "Auto");
			dropdown.addOption("dark", "Dark");
			dropdown.addOption("light", "Light");
			dropdown.setValue(this.plugin.settings.webViewDefaultColorMode);
			dropdown.onChange(async(state)=> {
				this.plugin.settings.webViewDefaultColorMode = state;
				await this.plugin.saveSettings();
				this.hide();
				this.display();
			})
		});

		new Setting(containerEl)
		.setName("Show daily notes")
		.setDesc("Will disply daily notes and allow to open and create daily notes")
		.addToggle((toggle) => {
			toggle.setValue(this.plugin.settings.activateDailyNoteAddon);
			toggle.onChange(async (state) => {
				this.plugin.settings.activateDailyNoteAddon = state;
				await this.plugin.saveSettings();
				this.hide();
				this.display();
			});
		});

		if(this.plugin.settings.activateDailyNoteAddon){
			new Setting(containerEl)
			.setName("Daily dot color")
			.setDesc("Color for daily note dots in month view")
			.addText((toggle) => {
				toggle.inputEl.type = "color"
				toggle.setValue(this.plugin.settings.dailyNoteDotColor);
				toggle.onChange(async (state) => {
					this.plugin.settings.dailyNoteDotColor = state;
					await this.plugin.saveSettings();
				});
			});
	
		}


		new Setting(containerEl)
		.setName("Auto create Event Notes")
		.setDesc("Will create new notes from a event if the description contains :obsidian:")
		.addToggle((toggle) => {
			toggle.setValue(this.plugin.settings.autoCreateEventNotes);
			toggle.onChange(async (state) => {
				this.plugin.settings.autoCreateEventNotes = state;
				await this.plugin.saveSettings();
				this.hide();
				this.display();
			});
		});

		new Setting(containerEl)
		.setName("Keep auto created Notes open")
		.setDesc("When creating a new note should it stay open for direct editing")
		.setClass("SubSettings")
		.addToggle((toggle) => {
			toggle.setValue(this.plugin.settings.autoCreateEventKeepOpen);
			toggle.onChange(async (state) => {
				this.plugin.settings.autoCreateEventKeepOpen = state;
				await this.plugin.saveSettings();
				this.hide();
				this.display();
			});
		});

		const s = new Setting(containerEl)
		.setName("Import Start Offset")
		.setDesc("Days in the past from events to import")
		.setClass("SubSettings")
		.addSlider(cb => {
			cb.setValue(this.plugin.settings.importStartOffset)
			cb.setLimits(0, 7, 1);
			cb.setDynamicTooltip();
			cb.onChange(async value => {
				cb.showTooltip()
				this.plugin.settings.importStartOffset = value;
				await this.plugin.saveSettings();
			});
		});

		new Setting(containerEl)
		.setName("Import End Offset")
		.setDesc("Days in the future from events to import")
		.setClass("SubSettings")
		.addSlider(cb => {
			cb.setValue(this.plugin.settings.importEndOffset)
			cb.setLimits(0, 7, 1);
			cb.setDynamicTooltip();
			cb.onChange(async value => {
				this.plugin.settings.importEndOffset = value;
				await this.plugin.saveSettings();
			});
		});


		new Setting(containerEl)
		.setName("Use defaults for note creation")
		.setDesc("If active creating notes will be faster but less flexable")
		.addToggle(toggle => {
			toggle.setValue(this.plugin.settings.useDefaultTemplate);
			toggle.onChange(async(state)=>{
				this.plugin.settings.useDefaultTemplate = state;
				await this.plugin.saveSettings();
				this.display();
			})
		})


	if(this.plugin.settings.useDefaultTemplate){
		new Setting(containerEl)
		.setName("Default Template")
		.setDesc("Template to use at note creation")
		.setClass("SubSettings")
		.addSearch((cb) => {
			new FileSuggest(
				cb.inputEl,
				this.plugin
			);
			cb.setPlaceholder("Template")
				.setValue(this.plugin.settings.defaultTemplate)
				.onChange(async(new_template) => {
					this.plugin.settings.defaultTemplate = new_template;
					await this.plugin.saveSettings();
				});
			// @ts-ignore
			cb.containerEl.addClass("templater_search");
		});
		
		new Setting(containerEl)
		.setName("Default Folder")
		.setDesc("Folder to save notes to after creation")
		.setClass("SubSettings")
		.addSearch((cb) => {
			new FolderSuggest(cb.inputEl);
			cb.setPlaceholder("Example: folder1/folder2")
				.setValue(this.plugin.settings.defaultFolder)
				.onChange(async(new_folder) => {
					this.plugin.settings.defaultFolder = new_folder;
					await this.plugin.saveSettings();
				});
			// @ts-ignore
			cb.containerEl.addClass("templater_search");
		});
	}


		const templateList:Template[] = this.plugin.settings.insertTemplates;
		if(templateList.length) {
			new Setting(containerEl).setName("Saved Templates");
			
			templateList.forEach((template:Template) => {
				const setting = new Setting(containerEl)
					.setClass("SubSettings")
					.setName(template.name)
					.addButton((button) => {
						button.setButtonText("Remove");
						button.onClick(async () => {
							this.plugin.settings.insertTemplates.remove(template);
							setting.settingEl.remove();
							await this.plugin.saveSettings();
							this.hide();
							this.display();
						});
					});
			});
		}

		if(settingsAreCompleteAndLoggedIn()){

			new Setting(containerEl)
				.setName("Default Calendar")
				.addDropdown(async (dropdown) => {
					dropdown.addOption("Default", "Select a calendar");
					const calendars = await googleListCalendars();

					calendars.forEach((calendar) => {
						dropdown.addOption(
							calendar.id,
							calendar.summary
						);
					});
					dropdown.setValue(this.plugin.settings.defaultCalendar);
					dropdown.onChange(async (value) => {
						this.plugin.settings.defaultCalendar = value;
						await this.plugin.saveSettings();			
					});
				});


			containerEl.createEl("h3", "Calendar Blacklist");
			const calendarBlackList = this.plugin.settings.calendarBlackList;

			new Setting(containerEl)
				.setName("Add Item to BlackList")
				.addDropdown(async (dropdown) => {
					dropdown.addOption("Default", "Select Option to add");
					const calendars = await googleListCalendars();

					calendars.forEach((calendar) => {
						dropdown.addOption(
							calendar.id + "_=_" + calendar.summary,
							calendar.summary
						);
						
					});

					dropdown.onChange(async (value) => {
						const [id, summery] = value.split("_=_");
						if (!calendarBlackList.contains([id, summery])) {
							this.plugin.settings.calendarBlackList = [
								...calendarBlackList,
								[id, summery],
							];

							await this.plugin.saveSettings();
						}
						const setting = new Setting(containerEl)
							.setClass("SubSettings")
							.setName(summery)
							.addButton((button) => {
								button.setButtonText("Remove");
								button.onClick(async () => {
									this.plugin.settings.calendarBlackList.remove([
										id,
										summery,
									]);
									setting.settingEl.remove();
									await this.plugin.saveSettings();
								});
							});
					});
				});

			calendarBlackList.forEach((calendar) => {
				const setting = new Setting(containerEl)
					.setClass("SubSettings")
					.setName(calendar[1])
					.addButton((button) => {
						button.setButtonText("Remove");
						button.onClick(async () => {
							this.plugin.settings.calendarBlackList.remove(calendar);
							setting.settingEl.remove();
							await this.plugin.saveSettings();
						});
					});
			});
		}
	}
}

export function settingsAreComplete(): boolean {
	const plugin = GoogleCalendarPlugin.getInstance();
	if (
		plugin.settings.googleClientId == "" ||
		plugin.settings.googleClientSecret == ""
	) {
		createNotice("Google Calendar missing settings");
		return false;
	}
	return true;
}

export function settingsAreCorret(): boolean {	
	if (
		/^[0-9a-zA-z-]*\.apps\.googleusercontent\.com$/.test(
			this.plugin.settings.googleClientId
		) == false
	) {
		new Notice("Client ID Token is not the correct format");
		return false;
	} else if (
		/^[0-9a-zA-z-]*$/.test(this.plugin.settings.googleClientSecret) == false
	) {
		new Notice("Client Secret is not the correct format");
		return false;
	}
	return true;
}

export function settingsAreCompleteAndLoggedIn(): boolean {

	if((!getRefreshToken() || getRefreshToken() == "") && (!getUserId() || getUserId() == "")) {
		createNotice(
			"Google Calendar missing settings or not logged in"
		);
		return false;
	}
	return true;
}
