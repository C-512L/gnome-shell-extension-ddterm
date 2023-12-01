#!/usr/bin/env python3

import os.path
import subprocess


PATTERNS = [
    ':/**/*.js',
    ':/**/*.ui',
    ':/**/*.desktop.in',
    ':/**/*.desktop.in.in',
    # exclude, just in case
    ':!/test/',
    ':!/tools/',
]


def check_file_translatable(filename, xgettext='xgettext', xgettext_args=('--from-code=UTF-8',)):
    argv = [xgettext, *xgettext_args, '-o-', filename]
    return subprocess.check_output(argv).strip() != b''


def all_git_files(git='git', chdir=os.curdir):
    argv = [git, '-C', chdir, 'ls-files', '-z', '--deduplicate', '--full-name', '--'] + PATTERNS

    return [
        os.fsdecode(filename)
        for filename in subprocess.check_output(argv).split(b'\0')
        if filename
    ]


def get_toplevel(git='git', chdir=os.curdir):
    argv = [git, '-C', chdir, 'rev-parse', '--show-toplevel']
    return os.fsdecode(subprocess.check_output(argv).rstrip(b'\n'))


def gen(output, git='git', xgettext='xgettext', chdir=os.curdir, xgettext_args=('--from-code=UTF-8',)):
    toplevel = get_toplevel(git=git, chdir=chdir)

    content = sorted(
        filename
        for filename in all_git_files(git=git, chdir=chdir)
        if check_file_translatable(os.path.join(toplevel, filename), xgettext=xgettext, xgettext_args=xgettext_args)
    )

    print(f'# This file is generated by {os.path.basename(__file__)}, do not edit', file=output)

    for line in content:
        print(line, file=output)


def cli():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('-o', '--output', type=argparse.FileType('w'))
    parser.add_argument('--git', default='git')
    parser.add_argument('--xgettext', default='xgettext')
    parser.add_argument('-C', dest='chdir', default=os.curdir)
    parser.add_argument('xgettext_args', nargs='*', default=('--from-code=UTF-8',))

    gen(**vars(parser.parse_args()))


if __name__ == '__main__':
    cli()
