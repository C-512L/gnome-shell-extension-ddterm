/*
    Copyright © 2023 Aleksandr Mezin

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

'use strict';

const { GLib, GObject, Gio, Meta } = imports.gi;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const { sd_journal_stream_fd } = Me.imports.ddterm.shell.sd_journal;

const SIGTERM = 15;

var Subprocess = GObject.registerClass(
    {
        Properties: {
            'g-subprocess': GObject.ParamSpec.object(
                'g-subprocess',
                '',
                '',
                GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
                Gio.Subprocess
            ),
        },
    },
    class DDTermSubprocess extends GObject.Object {
        _init(params) {
            super._init(params);

            this.wait().then(() => {
                const name = this.g_subprocess.argv[0];

                if (this.g_subprocess.get_if_signaled()) {
                    const signum = this.g_subprocess.get_term_sig();
                    const strsig = GLib.strsignal(signum);

                    log(`${name} killed by signal ${signum} (${strsig})`);
                } else {
                    const status = this.g_subprocess.get_exit_status();

                    log(`${name} exited with status ${status}`);
                }
            });
        }

        owns_window(win) {
            return win.get_pid().toString() === this.g_subprocess.get_identifier();
        }

        wait(cancellable = null) {
            return new Promise((resolve, reject) => {
                this.g_subprocess.wait_async(cancellable, (source, result) => {
                    try {
                        resolve(source.wait_finish(result));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        }

        terminate() {
            this.g_subprocess.send_signal(SIGTERM);
        }
    }
);

function make_subprocess_launcher(journal_identifier) {
    const subprocess_launcher = Gio.SubprocessLauncher.new(Gio.SubprocessFlags.NONE);

    if (GLib.log_writer_is_journald?.(1)) {
        /* eslint-disable max-len */
        /*
         * ShellApp.launch() connects to journald from the main GNOME Shell process too:
         * https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/51dc50144ecacc9ac1f807dcc6bdf4f1d49343ae/src/shell-app.c#L1452
         * So shouldn't be a problem here too.
         */
        try {
            const fd = sd_journal_stream_fd(journal_identifier);
            subprocess_launcher.take_stdout_fd(fd);
            subprocess_launcher.set_flags(Gio.SubprocessFlags.STDERR_MERGE);
        } catch (ex) {
            logError(ex, "Can't connect to systemd-journald");
        }
    }

    return subprocess_launcher;
}

function executable_name(argv) {
    return GLib.path_get_basename(argv[0]);
}

function spawn(argv) {
    log(`Starting subprocess: ${JSON.stringify(argv)}`);

    const subprocess_launcher = make_subprocess_launcher(executable_name(argv));

    return new Subprocess({ g_subprocess: subprocess_launcher.spawnv(argv) });
}

const WaylandSubprocess = GObject.registerClass(
    {
        Properties: {
            'wayland-client': GObject.ParamSpec.object(
                'wayland-client',
                '',
                '',
                GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
                Meta.WaylandClient
            ),
        },
    },
    class DDTermWaylandSubprocess extends Subprocess {
        owns_window(win) {
            if (win.get_client_type() === Meta.WindowClientType.WAYLAND)
                return this.wayland_client && this.wayland_client.owns_window(win);

            return super.owns_window(win);
        }
    }
);

function make_wayland_client(subprocess_launcher) {
    try {
        return Meta.WaylandClient.new(global.context, subprocess_launcher);
    } catch {
        return Meta.WaylandClient.new(subprocess_launcher);
    }
}

function spawn_wayland_client(argv) {
    log(`Starting wayland client subprocess: ${JSON.stringify(argv)}`);

    const subprocess_launcher = make_subprocess_launcher(executable_name(argv));
    const wayland_client = make_wayland_client(subprocess_launcher);

    return new WaylandSubprocess({
        g_subprocess: wayland_client.spawnv(global.display, argv),
        wayland_client,
    });
}

/* exported Subprocess spawn spawn_wayland_client */