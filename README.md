# usage-buddy

A Claude Code mod that puts the Clawd mascot above the prompt, animated by what Claude is doing, next to bars for your 5-hour and weekly plan usage.

## Install

In a Claude Code terminal session (not the desktop app's Code tab), type these two lines, one at a time:

```
/plugin marketplace add https://github.com/mteusbarbosa/usage-buddy.git
```

```
/plugin install usage-buddy@usage-buddy
```

Press Enter to pick the user scope. The band shows up right away, and in every session after, including the Claude desktop app's Code tab.

The same from a shell:

```
claude plugin marketplace add https://github.com/mteusbarbosa/usage-buddy.git
claude plugin install usage-buddy@usage-buddy
```

## Use

- `/usage-band` shows or hides the band.

## Options

Set these in `/config` under usage-buddy:

- **Mascot skin**: `auto` (the default) dresses Clawd as a pumpkin in a witch hat through October and leaves him as himself the rest of the year; `clawd` and `halloween` pin one look.
- **Mascot size**: the mascot sets the band's height. `large` (the default) is 52px, `medium` 39px, `small` 26px, about one line of text.

## Update

```
claude plugin update usage-buddy
```
