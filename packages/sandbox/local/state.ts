/**
 * State for a local (Replit-hosted) sandbox. The "sandbox" is a dedicated
 * directory on the host filesystem — commands run directly via child_process
 * and files are accessed via node's fs module.
 */
export interface LocalState {
  /** Unique sandbox identifier (also the subdirectory name) */
  sandboxName: string;
  /** Absolute path to the sandbox's working directory */
  workingDirectory: string;
}
