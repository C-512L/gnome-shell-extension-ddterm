#!/usr/bin/env -S gjs -m

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

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GIRepository from 'gi://GIRepository';

import Gi from 'gi';
import System from 'system';

import { manifest, manifest_file, get_os_ids, resolve_package } from '../dependencies.js';

function find_owner_command(os_ids) {
    for (const os of os_ids) {
        if (os === 'alpine')
            return filepath => ['apk', 'info', '-Wq', filepath];

        if (os === 'arch')
            return filepath => ['pacman', '-Qqo', filepath];

        if (os === 'debian')
            return filepath => ['dpkg-query', '-S', filepath];

        if (os === 'fedora' || os === 'suse')
            return filepath => ['rpm', '--queryformat', '%{NAME}\n', '-qf', filepath];
    }

    return null;
}

function find_owner(filepath, os_ids) {
    const command = find_owner_command(os_ids);

    const spawn_flags = GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.CHILD_INHERITS_STDERR;

    const [, stdout, , wait_status] =
        GLib.spawn_sync(null, command(filepath), null, spawn_flags, null);

    GLib.spawn_check_wait_status(wait_status);

    const output = new TextDecoder().decode(stdout);
    return output
        .split(/[,:]?\s+/)
        .map(v => v.replace(/:(amd64|arm64|armel|armhf|i386|mips64el|ppc64el|s390x)/, ''))
        .filter(v => v !== '' && v !== filepath);
}

function update_manifest(dry_run = false) {
    const os_ids = get_os_ids();
    let updated = false;

    for (const [lib, lib_manifest] of Object.entries(manifest)) {
        for (const [version, version_manifest] of Object.entries(lib_manifest)) {
            Gi.require(lib, version);

            const filepath = GIRepository.Repository.get_default().get_typelib_path(lib);
            const basename = Gio.File.new_for_path(filepath).get_basename();

            if (version_manifest.filename !== basename) {
                version_manifest.filename = basename;
                updated = true;
            }

            const found = find_owner(filepath, os_ids);

            if (found.length === 0)
                throw new Error(`Can't find package for file ${filepath}`);

            if (found.length > 1) {
                throw new Error(
                    `Multiple packages found for ${filepath}: ${found.join(' ')}`
                );
            }

            const resolved = resolve_package(version_manifest, os_ids);

            printerr(`${filepath} found package: ${found[0]} manifest: ${resolved}`);

            if (resolved !== found[0]) {
                version_manifest[os_ids[0]] = found[0];
                updated = true;
            }
        }
    }

    if (!dry_run && updated) {
        manifest_file.replace_contents(
            JSON.stringify(manifest, undefined, 1),
            null,
            false,
            Gio.FileCreateFlags.NONE,
            null
        );
    }

    return updated;
}

const check = ARGV.includes('--dry-run') || ARGV.includes('-n');
const diff = update_manifest(check);

System.exit(check && diff ? 1 : 0);
