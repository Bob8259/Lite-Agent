/**
 * Rename Extension Script
 *
 * Renames the VSCode extension from "Roo Code" (roo-cline) to "Lite-Agent" (lite-agent)
 * so it can coexist with the official Roo Code extension.
 *
 * This script changes:
 * 1. VSCode extension identifiers (name, publisher, command prefixes, view IDs, config keys)
 * 2. Display strings ("Roo Code" -> "Lite-Agent") in NLS and i18n files
 * 3. Output channel, terminal names, user-agent strings, etc.
 * 4. Placeholder URLs containing the old extension ID
 *
 * It does NOT change:
 * - @roo-code/* internal monorepo package references
 * - Git repository URLs (github.com/RooCodeInc/Roo-Code)
 * - roocode.com website URLs
 * - The nightly build overlay (apps/vscode-nightly/)
 * - Community links (reddit, discord)
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")

// ─── Replacement rules ───────────────────────────────────────────────
// Applied in order. Longer/more-specific patterns first to avoid partial matches.

const REPLACEMENTS = [
	// Publisher (must come before generic patterns)
	["RooVeterinaryInc", "LiteAgentDev"],

	// Package name / extension ID (the core identifier VSCode uses)
	["roo-cline", "lite-agent"],

	// Output channel / User-Agent header (hyphenated form)
	// Must come before "Roo Code" to avoid double-replacement
	["Roo-Code", "Lite-Agent"],

	// RooCode (single word, used in User-Agent like RooCode/version)
	["RooCode/", "LiteAgent/"],

	// Display name (used everywhere in UI, NLS, i18n)
	["Roo Code", "Lite-Agent"],

	// Lowercase keyword in package.json
	["roo code", "lite-agent"],
	["roocode", "liteagent"],
]

// ─── File targeting ──────────────────────────────────────────────────

/**
 * Glob-like file collection. We target specific directories and extensions
 * to avoid touching things we shouldn't (node_modules, .git, etc.)
 */
function collectFiles(dir, extensions, result = []) {
	let entries
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true })
	} catch {
		return result
	}
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			// Skip directories we don't want to touch
			if (["node_modules", ".git", "dist", "build", "bin", ".turbo", "logs"].includes(entry.name)) continue
			collectFiles(fullPath, extensions, result)
		} else if (entry.isFile()) {
			const ext = path.extname(entry.name).toLowerCase()
			if (extensions.includes(ext)) {
				result.push(fullPath)
			}
		}
	}
	return result
}

// Directories to process
const TARGET_DIRS = [path.join(ROOT, "src"), path.join(ROOT, "webview-ui")]

// File extensions to process
const TARGET_EXTENSIONS = [".json", ".ts", ".tsx", ".js", ".mjs"]

// ─── Exclusion rules ─────────────────────────────────────────────────

function shouldExclude(filePath) {
	const rel = path.relative(ROOT, filePath).replace(/\\/g, "/")

	// Don't touch node_modules anywhere
	if (rel.includes("node_modules/")) return true

	// Don't touch the nightly build overlay
	if (rel.startsWith("apps/vscode-nightly/")) return true

	// Don't touch pnpm-lock or other lock files
	if (rel.includes("pnpm-lock") || rel.includes("package-lock")) return true

	return false
}

// ─── Context-aware replacement ───────────────────────────────────────

/**
 * Some "Roo Code" occurrences should NOT be replaced:
 * - URLs like github.com/RooCodeInc/Roo-Code
 * - URLs like roocode.com
 * - @roo-code/* package references
 * - reddit.com/r/RooCode
 * - discord.gg/roocode
 */
function applyReplacements(content, filePath) {
	let result = content

	// Protect patterns we don't want to change by replacing them with placeholders
	const protections = []
	let protectionIndex = 0

	function protect(pattern) {
		const placeholder = `__PROTECTED_${protectionIndex++}__`
		// Use a function replacer to handle all occurrences
		const regex = typeof pattern === "string" ? new RegExp(escapeRegex(pattern), "g") : pattern
		result = result.replace(regex, (match) => {
			protections.push({ placeholder, original: match })
			return placeholder
		})
	}

	// Protect git URLs
	protect(/https?:\/\/github\.com\/Roo[Cc]ode[A-Za-z]*\/[A-Za-z-]+/g)
	protect(/git@github\.com:Roo[Cc]ode[A-Za-z]*\/[A-Za-z-]+/g)
	protect(/ssh:\/\/[^/]*github\.com\/Roo[Cc]ode[A-Za-z]*\/[A-Za-z-]+/g)

	// Protect website URLs
	protect(/https?:\/\/[a-z.]*roocode\.com[^\s"]*/g)

	// Protect @roo-code/* package references
	protect(/@roo-code\//g)

	// Protect community links
	protect(/reddit\.com\/r\/RooCode/g)
	protect(/discord\.gg\/roocode/g)

	// Protect "Roo Code Cloud" - we want to keep cloud references as-is since
	// the cloud service is still Roo Code Cloud (it's a separate service)
	// Actually, let's replace these too since the user wants full display rename
	// But keep the actual cloud service URLs intact (already protected above)

	// Protect the RooVetGit references (old git URLs)
	protect(/RooVetGit\/Roo-Cline/g)

	// Protect email addresses
	protect(/support@roocode\.com/g)
	protect(/noreply@example\.com/g)

	// Protect "Roo Code Router" -> keep as "Lite-Agent Router" (will be handled by "Roo Code" replacement)
	// Protect "Roo Code Cloud" -> will become "Lite-Agent Cloud" (handled by "Roo Code" replacement)

	// Now apply the replacements
	for (const [from, to] of REPLACEMENTS) {
		result = result.split(from).join(to)
	}

	// Restore protected patterns
	for (const { placeholder, original } of protections) {
		while (result.includes(placeholder)) {
			result = result.replace(placeholder, original)
		}
	}

	return result
}

function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
	console.log("Collecting files...")

	const files = []
	for (const dir of TARGET_DIRS) {
		collectFiles(dir, TARGET_EXTENSIONS, files)
	}

	// Filter out excluded files
	const targetFiles = files.filter((f) => !shouldExclude(f))

	console.log(`Found ${targetFiles.length} files to process.`)

	let changedCount = 0

	for (const filePath of targetFiles) {
		const original = fs.readFileSync(filePath, "utf8")
		const modified = applyReplacements(original, filePath)

		if (modified !== original) {
			fs.writeFileSync(filePath, modified, "utf8")
			const rel = path.relative(ROOT, filePath).replace(/\\/g, "/")
			console.log(`  Changed: ${rel}`)
			changedCount++
		}
	}

	console.log(`\nDone. ${changedCount} files modified.`)
}

main()
