import { X } from "lucide-react";

interface SetupGuideModalProps {
  onClose: () => void;
}

export function SetupGuideModal({ onClose }: SetupGuideModalProps) {
  return (
    <div
      className="shortcut-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="setup-guide-box" onClick={(e) => e.stopPropagation()}>
        <div className="shortcut-header">
          <span>GOOGLE CLOUD CONSOLE SETUP GUIDE</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Close setup modal"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="setup-step">
          <span className="setup-step-tag">STEP 1</span>
          <h4>Authorized JavaScript Origins</h4>
          <p>
            In Google Cloud Console under <strong>APIs &amp; Services &gt; Credentials &gt; OAuth 2.0 Client IDs</strong>:
            Ensure your local and production URLs are added to <strong>Authorized JavaScript origins</strong>:
          </p>
          <div className="setup-code-block">http://localhost:5173</div>
          <div className="setup-code-block">http://127.0.0.1:5173</div>
          <div className="setup-code-block">https://tasks.ramascript.com</div>
        </div>

        <div className="setup-step">
          <span className="setup-step-tag">STEP 2</span>
          <h4>Enable Google Tasks API</h4>
          <p>
            Go to <strong>APIs &amp; Services &gt; Library</strong>, search for <strong>Google Tasks API</strong>, and click <strong>Enable</strong>.
          </p>
        </div>

        <div className="setup-step">
          <span className="setup-step-tag">STEP 3</span>
          <h4>OAuth Consent Screen Scopes</h4>
          <p>
            Under <strong>APIs &amp; Services &gt; OAuth consent screen</strong>, ensure these scopes are added:
          </p>
          <div className="setup-code-block">https://www.googleapis.com/auth/tasks</div>
          <div className="setup-code-block">openid, email, profile</div>
        </div>

        <div className="setup-step">
          <span className="setup-step-tag">STEP 4</span>
          <h4>Add Test Users (If App is in Testing)</h4>
          <p>
            If your app status is <strong>Testing</strong>, Google blocks non-test accounts. Add your Google email address to the <strong>Test Users</strong> list in the OAuth consent screen.
          </p>
        </div>

        <div className="setup-step">
          <span className="setup-step-tag">STEP 5</span>
          <h4>Environment Variable</h4>
          <p>
            Make sure your client ID is set in <code>.env</code>:
          </p>
          <div className="setup-code-block">VITE_GOOGLE_CLIENT_ID=713710393955-n7ajcagu2n77foepjs1qddbm92ucdptl.apps.googleusercontent.com</div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button
            type="button"
            className="primary-button"
            onClick={onClose}
          >
            GOT IT, CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
