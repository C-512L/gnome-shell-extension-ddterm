/*
    Copyright © 2022 Aleksandr Mezin

    This file is part of ddterm GNOME Shell extension.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import Gettext from 'gettext';

import { PrefsDialog } from '../../app/prefsdialog.js';
import { get_settings } from '../../app/settings.js';
import { dir, metadata } from '../../app/meta.js';

export const Application = GObject.registerClass({
}, class Application extends Gtk.Application {
    _init(params) {
        super._init(params);

        this.connect('startup', this.startup.bind(this));
        this.connect('activate', this.activate.bind(this));
    }

    startup() {
        Gettext.bindtextdomain(
            metadata['gettext-domain'],
            dir.get_child('locale').get_path()
        );

        this.settings = get_settings();
    }

    activate() {
        this.preferences();
    }

    preferences() {
        const prefs_dialog = new PrefsDialog({
            settings: this.settings,
            application: this,
        });

        prefs_dialog.show();
    }
});
