# Security policy

Report a vulnerability privately through GitHub's "Report a
vulnerability" button on this repository's Security tab. Please do not
open a public issue for it. You will get a reply within 7 days.

Scope: the code in this repository. The lab writes only local files
inside lab/stack/build and uses no cloud account or credential. Secret
values in corpus/ are fixture markers with the prefix TEST-SECRET, and
a test asserts that no live key prefix appears there. State files and
plan binaries are git ignored.
