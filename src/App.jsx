
import { useEffect, useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:5000'
const APPLICATIONS_URL = `${API_BASE}/api/applications`
const EXTRACT_URL = `${API_BASE}/api/extract-job`
const IMPROVE_DESCRIPTION_URL = `${API_BASE}/api/improve-description`

function App() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [resumeFile, setResumeFile] = useState(null)
  const [screenshots, setScreenshots] = useState([])
  const [extracting, setExtracting] = useState(false)
  const [improvingDescription, setImprovingDescription] = useState(false)
  const [showAddOptions, setShowAddOptions] = useState(false)
  const [screenshotPreviews, setScreenshotPreviews] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null);
const [deleteError, setDeleteError] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Create temporary thumbnail URLs for screenshots currently queued for extraction.
  useEffect(() => {
    const previews = screenshots.map((file) => ({
      name: file.name || 'Pasted screenshot',
      url: URL.createObjectURL(file),
    }))
    setScreenshotPreviews(previews)

    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url))
  }, [screenshots])

  const emptyForm = () => ({
    company: '',
    role: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'Applied',
    jobUrl: '',
    description: '',
    interviewDate: '',
    notes: '',
  })

  const [form, setForm] = useState(emptyForm)

  // While the screenshot-import modal is open, allow images to be pasted with Ctrl+V.
  useEffect(() => {
    if (!showAddOptions) return

    function handleClipboardPaste(event) {
      const items = Array.from(event.clipboardData?.items || [])
      const imageFiles = items
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter(Boolean)

      if (imageFiles.length) {
        event.preventDefault()
        setScreenshots((previous) => [...previous, ...imageFiles])
      }
    }

    window.addEventListener('paste', handleClipboardPaste)
    return () => window.removeEventListener('paste', handleClipboardPaste)
  }, [showAddOptions])

  function addScreenshotFiles(fileList) {
    const imageFiles = Array.from(fileList || []).filter((file) =>
      ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    )

    if (imageFiles.length) {
      setScreenshots((previous) => [...previous, ...imageFiles])
    }
  }

  // Load applications from MongoDB through the Express API.
  useEffect(() => {
    async function loadApplications() {
      try {
        const response = await fetch(APPLICATIONS_URL)

        if (!response.ok) {
          throw new Error('Could not load applications.')
        }

        const data = await response.json()

        setApplications(
          data.map((app) => ({
            ...app,
            id: app._id || app.id,
          }))
        )
      } catch (error) {
        console.error('Loading applications failed:', error)
        alert(
          'Could not connect to JobTrack API. Check that the backend is running.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
  }, [])

  // Update a form field when the user types or selects a value.
  function updateField(event) {
    const { name, value } = event.target
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  // Open a blank form or populate the form for editing.
  function openForm(application = null) {
    setResumeFile(null)
    setEditingId(application?.id ?? null)

    if (application) {
      setForm({
        company: application.company || '',
        role: application.role || '',
        date: application.date || new Date().toISOString().slice(0, 10),
        status: application.status || 'Applied',
        jobUrl: application.jobUrl || '',
        description: application.description || '',
        interviewDate: application.interviewDate || '',
        notes: application.notes || '',
      })
    } else {
      setForm(emptyForm())
    }

    setShowForm(true)
  }


async function importScreenshots(filesToImport = screenshots) {
  if (!filesToImport.length) {
    alert('Paste a screenshot with Ctrl+V or choose at least one image file.')
    return
  }

  const body = new FormData()
  filesToImport.forEach((file) => {
    body.append('screenshots', file)
  })

  setExtracting(true)

  try {
    const response = await fetch(EXTRACT_URL, {
      method: 'POST',
      body,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Screenshot extraction failed.')
    }

    setEditingId(null)
    setResumeFile(null)

    setForm({
      ...emptyForm(),
      company: result.company || '',
      role: result.role || '',
      jobUrl: result.jobUrl || '',
      description: result.description || '',
    })

    setShowAddOptions(false)
    setShowForm(true)
    setScreenshots([])
  } catch (error) {
    console.error('Screenshot extraction failed:', error)
    alert(error.message || 'Could not extract job details.')
  } finally {
    setExtracting(false)
  }
}


  // Use Gemini to organize the job description into readable sections and bullets.
  async function improveJobDescription() {
    const description = form.description.trim()

    if (!description) {
      alert('Paste a job description first, then click Improve with AI.')
      return
    }

    setImprovingDescription(true)

    try {
      const response = await fetch(IMPROVE_DESCRIPTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Could not improve the job description.')
      }

      if (!result.description) {
        throw new Error('AI returned an empty description. Please try again.')
      }

      setForm((previous) => ({ ...previous, description: result.description }))
    } catch (error) {
      console.error('Improving job description failed:', error)
      alert(error.message || 'Could not improve the job description.')
    } finally {
      setImprovingDescription(false)
    }
  }

  // Read a PDF so it can be sent to the current API.
  async function readResume(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        resolve({
          name: file.name,
          data: reader.result,
        })
      }

      reader.onerror = () => {
        reject(new Error('Unable to read the resume file.'))
      }

      reader.readAsDataURL(file)
    })
  }

  // Create a new application or update an existing one.
  async function saveApplication(event) {
    event.preventDefault()

    try {
      const existingResume = editingId
        ? applications.find((app) => app.id === editingId)?.resume
        : null

      let resume = existingResume || null

      if (resumeFile) {
        if (resumeFile.type !== 'application/pdf') {
          alert('Please select a PDF resume.')
          return
        }

        resume = await readResume(resumeFile)
      }

      const applicationData = {
        ...form,
        resume,
      }

      const response = await fetch(
        editingId
          ? `${APPLICATIONS_URL}/${editingId}`
          : APPLICATIONS_URL,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(applicationData),
        }
      )

      const savedApplication = await response.json()

      if (!response.ok) {
        throw new Error(
          savedApplication.message || 'Could not save application.'
        )
      }

      const saved = {
        ...savedApplication,
        id: savedApplication._id || savedApplication.id,
      }

      if (editingId) {
        setApplications((previous) =>
          previous.map((app) => (app.id === editingId ? saved : app))
        )
      } else {
        setApplications((previous) => [saved, ...previous])
      }

      setShowForm(false)
      setEditingId(null)
      setResumeFile(null)
    } catch (error) {
      console.error('Saving application failed:', error)
      alert(error.message || 'Something went wrong while saving.')
    }
  }


const deleteApplication = async (id) => {
  try {
    const response = await fetch(`${APPLICATIONS_URL}/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete application')
    }

    setApplications((previous) => previous.filter((app) => app.id !== id))
    setDeleteTarget(null)
    setDeleteError('')
  } catch (error) {
    console.error('Deleting application failed:', error)
    setDeleteError('Could not delete the application. Please try again.')
  }
}

  // Upload or replace the resume attached to an application.
  async function updateResume(id, file) {
    if (!file) return

    if (file.type !== 'application/pdf') {
      alert('Please select a PDF resume.')
      return
    }

    try {
      const resume = await readResume(file)
      const current = applications.find((app) => app.id === id)

      if (!current) return

      const response = await fetch(`${APPLICATIONS_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: current.company,
          role: current.role,
          date: current.date,
          status: current.status,
          jobUrl: current.jobUrl || '',
          description: current.description || '',
          interviewDate: current.interviewDate || '',
          notes: current.notes || '',
          resume,
        }),
      })

      const updatedApplication = await response.json()

      if (!response.ok) {
        throw new Error(
          updatedApplication.message || 'Could not update resume.'
        )
      }

      const updated = {
        ...updatedApplication,
        id: updatedApplication._id || updatedApplication.id,
      }

      setApplications((previous) =>
        previous.map((app) => (app.id === id ? updated : app))
      )
    } catch (error) {
      console.error('Updating resume failed:', error)
      alert(error.message || 'Could not upload the resume.')
    }
  }

  // Search and filter applications.
  const filteredApplications = applications.filter((app) => {
    const company = (app.company || '').toLowerCase()
    const role = (app.role || '').toLowerCase()
    const query = search.toLowerCase()

    const matchesSearch =
      company.includes(query) || role.includes(query)

    return matchesSearch && (filter === 'All' || app.status === filter)
  })

const interviewApplications = applications.filter(
    (app) => Boolean(app.interviewDate)
  );

  const selectedDateInterviews = interviewApplications.filter(
    (app) => app.interviewDate === selectedDate
  );

  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const firstWeekday = new Date(calendarYear, calendarMonthIndex, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, (_, index) => ({
      key: `empty-${index}`,
      day: null,
    })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({
      key: `day-${index + 1}`,
      day: index + 1,
    })),
  ];
  while (calendarCells.length % 7 !== 0) {
    calendarCells.push({ key: `trailing-${calendarCells.length}`, day: null });
  }

  const todayString = new Date().toISOString().slice(0, 10);
  const monthLabel = calendarMonth.toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="app">
      <aside className="sidebar">
         <h2 className="logo logo-reference">
  <span className="logo-job">Job</span><span className="logo-track">Track</span>
</h2>

        <section className="sidebar-calendar" aria-label="Interview calendar">
          <div className="calendar-heading">
            <h3>Interview calendar</h3>
            <div className="calendar-month-controls">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              >‹</button>
              <strong>{monthLabel}</strong>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              >›</button>
            </div>
          </div>

          <div className="calendar-grid calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid calendar-days">
            {calendarCells.map((cell) => {
              if (!cell.day) {
                return <span className="calendar-empty-day" key={cell.key} aria-hidden="true" />;
              }

              const dateString = `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
              const hasInterview = interviewApplications.some((app) => app.interviewDate === dateString);
              const isToday = dateString === todayString;
              const isSelected = dateString === selectedDate;

              return (
                <button
                  type="button"
                  key={cell.key}
                  className={[
                    'calendar-day',
                    hasInterview ? 'has-interview' : '',
                    isToday ? 'is-today' : '',
                    isSelected ? 'is-selected' : '',
                  ].filter(Boolean).join(' ')}
                  aria-label={`${dateString}${hasInterview ? ', interview scheduled' : ''}`}
                  onClick={() => setSelectedDate(dateString)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="calendar-legend">
            <span><i className="legend-interview" /> Interview</span>
            <span><i className="legend-today" /> Today</span>
          </div>

          <div className="selected-interviews">
            <h4>
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </h4>
            {selectedDateInterviews.length === 0 ? (
              <p className="calendar-empty-message">No interviews scheduled for this date.</p>
            ) : (
              selectedDateInterviews.map((app) => (
                <article className="calendar-interview-card" key={app.id}>
                  <strong>{app.company}</strong>
                  <p>{app.role}</p>
                  {app.notes && <small>{app.notes}</small>}
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setFilter('All');
                      document.getElementById(`application-${app.id}`)?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                      });
                    }}
                  >View application ↗</button>
                </article>
              ))
            )}
          </div>
        </section>

        <div className="sidebar-footer">
          Your job search, organized.
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <section className="stats">
          <div className="stat-card">
            <span className="stat-icon blue">▤</span>
            <p>Total applications</p>
            <h2>{applications.length}</h2>
          </div>

          <div className="stat-card">
            <span className="stat-icon amber">◷</span>
            <p>Interviews</p>
            <h2>
              {applications.filter((app) => app.status === 'Interview').length}
            </h2>
          </div>

          <div className="stat-card">
            <span className="stat-icon green">✓</span>
            <p>Offers</p>
            <h2>
              {applications.filter((app) => app.status === 'Offer').length}
            </h2>
          </div>
        </section>

        <section className="panel" id="applications">
          <div className="section-heading">
            <div>
              <h2>Applications</h2>
              <p className="muted">Manage your job opportunities.</p>
            </div>

           <button
              type="button"
              className="primary-button"
              onClick={() => { setScreenshots([]); setShowAddOptions(true) }}
            >
              + Add new
            </button>
          </div>

          <div className="toolbar">
            <input
              aria-label="Search applications"
              placeholder="Search company or role..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              {['All', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected'].map(
                (status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                )
              )}
            </select>
          </div>

          {loading ? (
            <div className="empty-state">
              <h3>Loading applications...</h3>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">▤</div>

              <h3>
                {applications.length
                  ? 'No matching applications'
                  : 'No applications yet'}
              </h3>

              <p>
                Add your first job application to start tracking your search.
              </p>

              {!applications.length && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => openForm()}
                >
                  + Add your first application
                </button>
              )}
            </div>
          ) : (
            <div className="application-list">
              {filteredApplications.map((app) => (
                    <article
                      className="application-card"
                      id={`application-${app.id}`}
                      key={app.id}
                    >
                  <div className="company-avatar">
                    {(app.company || '?').slice(0, 1).toUpperCase()}
                  </div>

                  <div className="application-info">
                    <h3>{app.company}</h3>
                    <p>{app.role}</p>
                    <small>Applied {app.date}</small>

                    {app.jobUrl && (
                      <a className="application-job-posting" href={app.jobUrl} target="_blank" rel="noreferrer">
                        Job posting ↗
                      </a>
                    )}

                    {app.notes && (
                      <p className="muted">Notes: {app.notes}</p>
                    )}

                    {app.interviewDate && (
                      <p className="interview-date">
                        Interview: {app.interviewDate}
                      </p>
                    )}

                    </div>

                    <div className="application-actions">
                      <span
                        className={`status status-${(
                          app.status || 'Applied'
                        ).toLowerCase()}`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <div className="application-card-footer">
                      <div className="resume-row">
                        {app.resume?.data && (
                          <button
                            type="button"
                            className="resume-link"
                            onClick={() => {
                              try {
                                const parts = app.resume.data.split(',')
                                const binary = atob(parts[1])
                                const bytes = new Uint8Array(binary.length)
                                for (let i = 0; i < binary.length; i++) {
                                  bytes[i] = binary.charCodeAt(i)
                                }
                                const blob = new Blob([bytes], { type: 'application/pdf' })
                                const pdfUrl = URL.createObjectURL(blob)
                                window.open(pdfUrl, '_blank', 'noopener,noreferrer')
                                setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000)
                              } catch (error) {
                                console.error('Unable to open PDF:', error)
                                alert('Could not open the PDF.')
                              }
                            }}
                          >
                            View PDF
                          </button>
                        )}
                        {app.description && (
                          <details className="job-description-details">
                            <summary>Details</summary>
                            <p className="description">{app.description}</p>
                          </details>
                        )}
                      </div>

                      <div className="application-card-footer-actions">
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => openForm(app)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-button danger"
                          onClick={() => {
                            setDeleteError('')
                            setDeleteTarget(app)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                </article>
              ))}
            </div>
          )}
        </section>


      </main>
      
{showAddOptions && (
  <div
    className="modal-backdrop"
    onClick={(event) => {
      if (event.target === event.currentTarget && !extracting) {
        setShowAddOptions(false)
        setScreenshots([])
      }
    }}
  >
    <div className="application-form add-options-modal">
      <div className="form-heading">
        <div>
          <h2>Add a job</h2>
          <p className="muted">Choose a method to continue.</p>
        </div>
        <button
          type="button"
          className="close-button"
          aria-label="Close"
          disabled={extracting}
          onClick={() => {
            setShowAddOptions(false)
            setScreenshots([])
          }}
        >
          ✕
        </button>
      </div>

      <button
        type="button"
        className="add-option-card manual-option"
        disabled={extracting}
        onClick={() => {
          setShowAddOptions(false)
          setScreenshots([])
          openForm()
        }}
      >
        <strong>Add manually</strong>
        <span>Enter the job details yourself.</span>
      </button>

      <section className="paste-screenshot-box">
        <div className="paste-screenshot-copy">
          <strong>Paste screenshots</strong>
          <span>Copy a job-posting screenshot, then press <kbd>Ctrl</kbd> + <kbd>V</kbd> here. You can paste more than one.</span>
        </div>

        <div
          className="paste-drop-area"
          tabIndex={0}
          aria-label="Paste job screenshots here"
          onClick={(event) => event.currentTarget.focus()}
        >
          <span className="paste-icon">⌘</span>
          <span>Click here, then press <strong>Ctrl + V</strong></span>
          <span className="paste-count">
            {screenshots.length === 0
              ? 'No screenshots added yet'
              : `${screenshots.length} screenshot${screenshots.length === 1 ? '' : 's'} ready`}
          </span>
        </div>

        {screenshotPreviews.length > 0 && (
          <div className="screenshot-preview-section" aria-label="Screenshot previews">
            <div className="screenshot-preview-heading">Preview screenshots</div>
            <div className="screenshot-preview-grid">
              {screenshotPreviews.map((preview, index) => (
                <div className="screenshot-preview-item" key={`${preview.url}-${index}`}>
                  <img src={preview.url} alt={`Screenshot ${index + 1} preview`} />
                  <span title={preview.name}>{index + 1}. {preview.name}</span>
                  <button
                    type="button"
                    className="screenshot-remove-button"
                    aria-label={`Remove screenshot ${index + 1}`}
                    disabled={extracting}
                    onClick={() => setScreenshots((previous) => previous.filter((_, i) => i !== index))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="paste-screenshot-actions">
          <label className="secondary-button screenshot-choose">
            Choose files
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              hidden
              disabled={extracting}
              onChange={(event) => {
                addScreenshotFiles(event.target.files)
                event.target.value = ''
              }}
            />
          </label>

          {screenshots.length > 0 && (
            <button
              type="button"
              className="text-button"
              disabled={extracting}
              onClick={() => setScreenshots([])}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            className="primary-button"
            disabled={extracting || screenshots.length === 0}
            onClick={() => importScreenshots(screenshots)}
          >
            {extracting ? 'Extracting…' : 'Extract job details'}
          </button>
        </div>
        {extracting && (
          <p className="muted extraction-note">AI is reading your screenshots. This may take a moment.</p>
        )}
      </section>

      <div className="form-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={extracting}
          onClick={() => {
            setShowAddOptions(false)
            setScreenshots([])
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

      {showForm && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowForm(false)
            }
          }}
        >
          <form className="application-form" onSubmit={saveApplication}>
            <div className="form-heading">
              <div>
                <h2>{editingId ? 'Edit application' : 'Add application'}</h2>
                <p className="muted">Review and save your job details.</p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setShowForm(false)}
              >
                ✕
              </button>
            </div>

            <label>
              Company name *
              <input
                name="company"
                value={form.company}
                onChange={updateField}
                required
                placeholder="e.g. Acme Technologies"
              />
            </label>

            <label>
              Job role *
              <input
                name="role"
                value={form.role}
                onChange={updateField}
                required
                placeholder="e.g. Junior Developer"
              />
            </label>

            <div className="form-grid">
              <label>
                Application date *
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={updateField}
                >
                  {['Applied', 'Assessment', 'Interview', 'Offer', 'Rejected'].map(
                    (status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <label>
              Job posting URL
              <input
                type="url"
                name="jobUrl"
                value={form.jobUrl}
                onChange={updateField}
                placeholder="https://..."
              />
            </label>

            <label>
              Interview date (optional)
              <input
                type="date"
                name="interviewDate"
                value={form.interviewDate}
                onChange={updateField}
              />
            </label>

            <label>
              Resume (PDF)
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => {
                  setResumeFile(event.target.files?.[0] || null)
                }}
              />

              <small>
                {resumeFile
                  ? `Selected: ${resumeFile.name}`
                  : editingId
                    ? `Current resume: ${
                        applications.find((app) => app.id === editingId)?.resume
                          ?.name || 'No resume uploaded'
                      }`
                    : 'Select the PDF resume submitted for this job.'}
              </small>
            </label>

            <label className="job-description-form-field">
              <span className="job-description-label">Job description</span>
              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                rows="6"
                placeholder="Paste the job description here..."
              />
              <div className="description-ai-row">
                <span className="description-ai-hint">Organize the text into clear sections and bullet points.</span>
                <button
                  type="button"
                  className="improve-description-button"
                  onClick={improveJobDescription}
                  disabled={improvingDescription || !form.description.trim()}
                >
                  {improvingDescription ? 'Improving…' : '✨ Improve with AI'}
                </button>
              </div>
            </label>

            <label>
              Notes (optional)
              <textarea
                name="notes"
                value={form.notes}
                onChange={updateField}
                rows="2"
                placeholder="Recruiter details, preparation notes..."
              />
            </label>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button type="submit" className="primary-button">
                {editingId ? 'Save changes' : 'Save application'}
              </button>
            </div>
          </form>
        </div>
      )}
      
{deleteTarget && (
  <div
    className="modal-backdrop delete-overlay"
    onClick={(event) => {
      if (event.target === event.currentTarget) {
        setDeleteTarget(null)
        setDeleteError('')
      }
    }}
  >
    <div
      className="delete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="delete-modal-icon">!</div>
      <h2 id="delete-modal-title">Delete application?</h2>
      <p>
        Are you sure you want to delete{' '}
        <strong>{deleteTarget.company}</strong>? This action cannot be undone.
      </p>

      {deleteError && <p className="delete-error">{deleteError}</p>}

      <div className="delete-modal-actions">
        <button
          type="button"
          className="cancel-button"
          onClick={() => {
            setDeleteTarget(null)
            setDeleteError('')
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="confirm-delete-button"
          onClick={() => deleteApplication(deleteTarget.id)}
        >
          Delete application
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  )
}

export default App
