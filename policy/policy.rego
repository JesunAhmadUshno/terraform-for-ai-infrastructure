package main

# Deny public exposure of a planned service.
deny contains msg if {
	rc := input.resource_changes[_]
	rc.type == "local_file"
	svc := json.unmarshal(rc.change.after.content)
	svc.exposure == "public"
	msg := sprintf("public exposure in %s", [rc.address])
}

# Deny binding a service to all interfaces.
deny contains msg if {
	rc := input.resource_changes[_]
	rc.type == "local_file"
	svc := json.unmarshal(rc.change.after.content)
	svc.bind == "0.0.0.0"
	msg := sprintf("bind to all interfaces in %s", [rc.address])
}

# Deny a hard coded secret in planned content. The value is a test fixture marker in the corpus.
deny contains msg if {
	rc := input.resource_changes[_]
	rc.type == "local_file"
	svc := json.unmarshal(rc.change.after.content)
	key := object.get(svc, "api_key", "")
	key != ""
	msg := sprintf("hard coded secret in %s", [rc.address])
}

# Deny disabled encryption.
deny contains msg if {
	rc := input.resource_changes[_]
	rc.type == "local_file"
	svc := json.unmarshal(rc.change.after.content)
	svc.encryption_enabled == false
	msg := sprintf("encryption disabled in %s", [rc.address])
}

# Deny world writable file permission.
deny contains msg if {
	rc := input.resource_changes[_]
	rc.type == "local_file"
	rc.change.after.file_permission == "0777"
	msg := sprintf("world writable permission in %s", [rc.address])
}
