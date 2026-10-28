import { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, ChartNoAxesCombined,
  Settings, Bell, Search, Plus, ArrowUpRight, ArrowDownRight,
  Utensils, Car, ShoppingBag, House, BriefcaseBusiness, Menu,
  Trash2, RefreshCw, X, Pencil, RotateCcw, TrendingUp,
  TrendingDown, CalendarDays, CircleDollarSign, PiggyBank,
  Target, Check, Download
} from 'lucide-react'
import './App.css'

const API_URL = 'http://localhost:5000/api'

const DEFAULT_BUDGETS = [
  { name: 'Food & Groceries', limit: 10000, color: 'green' },
  { name: 'Transport', limit: 4000, color: 'blue' },
  { name: 'Shopping', limit: 5000, color: 'orange' },
  { name: 'Bills & Utilities', limit: 4000, color: 'purple' },
]
const EXPENSE_CATEGORIES = [
  'Food & Groceries', 'Food & Dining', 'Transport', 'Shopping',
  'Bills & Utilities', 'Utilities', 'Health', 'Entertainment', 'Education', 'Other'
]
const INCOME_CATEGORIES = ['Income', 'Salary', 'Freelance', 'Investment', 'Other']
const formatMoney = amount => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(amount) || 0)
const formatDate = value => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
const monthKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const monthLabel = date => date.toLocaleDateString('en-IN', { month: 'short' })
const getTransactionIcon = transaction => {
  if (transaction.type === 'income') return BriefcaseBusiness
  const category = (transaction.category || '').toLowerCase()
  if (category.includes('transport') || category.includes('travel')) return Car
  if (category.includes('food') || category.includes('dining')) return Utensils
  if (category.includes('grocer') || category.includes('shopping')) return ShoppingBag
  if (category.includes('bill') || category.includes('utilit') || category.includes('house')) return House
  return Wallet
}
const readBudgets = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('spendwise-budgets') || 'null')
    if (!Array.isArray(saved)) return DEFAULT_BUDGETS
    return DEFAULT_BUDGETS.map(defaultBudget => {
      const budget = saved.find(item => item.name === defaultBudget.name)
      return budget && Number(budget.limit) > 0
        ? { ...defaultBudget, limit: Number(budget.limit) }
        : defaultBudget
    })
  } catch { return DEFAULT_BUDGETS }
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('spendwise-token') || '')
  const [currentUser, setCurrentUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [activePage, setActivePage] = useState('Overview')
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [budgetLimits, setBudgetLimits] = useState(readBudgets)
  const [editingBudget, setEditingBudget] = useState(null)
  const [budgetDraft, setBudgetDraft] = useState('')
  const [analyticsRange, setAnalyticsRange] = useState('6')
  const [form, setForm] = useState({
    name: '', category: 'Food & Groceries', amount: '', type: 'expense',
    date: new Date().toISOString().slice(0, 10), notes: '',
  })

  const loadTransactions = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`Could not load transactions (${response.status})`)
      const data = await response.json()
if (!Array.isArray(data)) {
        throw new Error('Unexpected response from the transactions API')
      }

      setItems(data)
    } catch (err) {
      setError(
        `${err.message}. Check that the backend and MongoDB are running.`
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      setItems([])
      setCurrentUser(null)
      setLoading(false)
      return
    }
    let cancelled = false
    const initializeSession = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Session expired. Please log in again.')
        if (cancelled) return
        setCurrentUser(data.user || data)
        await loadTransactions()
      } catch (err) {
        if (cancelled) return
        localStorage.removeItem('spendwise-token')
        setToken('')
        setCurrentUser(null)
        setItems([])
        setError(err.message || 'Please log in again.')
        setLoading(false)
      }
    }
    initializeSession()
    return () => { cancelled = true }
  }, [token])

  useEffect(() => {
    try {
      localStorage.setItem(
        'spendwise-budgets',
        JSON.stringify(budgetLimits)
      )
    } catch {
      setError('Could not save budget settings in this browser.')
    }
  }, [budgetLimits])


  const handleAuth = async event => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (authMode === 'register' && !authName.trim()) return setError('Please enter your name.')
    if (!authEmail.trim() || !authPassword) return setError('Please enter your email and password.')
    if (authMode === 'register' && authPassword.length < 8) return setError('Password must contain at least 8 characters.')
    setAuthLoading(true)
    try {
      const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login'
      const payload = authMode === 'register'
        ? { name: authName.trim(), email: authEmail.trim(), password: authPassword }
        : { email: authEmail.trim(), password: authPassword }
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Authentication failed.')
      if (!data.token) throw new Error('Server did not return an authentication token.')
      localStorage.setItem('spendwise-token', data.token)
      setCurrentUser(data.user || null)
      setToken(data.token)
      setAuthPassword('')
      setNotice(authMode === 'register' ? 'Account created successfully.' : 'Logged in successfully.')
    } catch (err) {
      setError(err.message || 'Could not connect to the server.')
    } finally { setAuthLoading(false) }
  }

  const handleLogout = () => {
    localStorage.removeItem('spendwise-token')
    setToken('')
    setCurrentUser(null)
    setItems([])
    setQuery('')
    setShowForm(false)
    setError('')
    setNotice('')
  }

  const totals = useMemo(() => {
    const income = items
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    const expenses = items
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    return {
      income,
      expenses,
      balance: income - expenses,
      savingsRate: income
        ? Math.round(((income - expenses) / income) * 100)
        : 0,
    }
  }, [items])

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()

    return [...items]
      .filter(t =>
        `${t.name || ''} ${t.category || ''} ${t.type || ''} ${t.notes || ''}`
          .toLowerCase()
          .includes(search)
      )
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )
  }, [items, query])

  const budgets = useMemo(() => {
    const now = new Date()

    return budgetLimits.map(budget => {
      const spent = items
        .filter(t => {
          const date = new Date(t.date)

          return (
            t.type === 'expense' &&
            t.category === budget.name &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          )
        })
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)

      return {
        ...budget,
        spent,
        remaining: budget.limit - spent,
        percentage: budget.limit > 0 ? (spent / budget.limit) * 100 : 0,
      }
    })
  }, [items, budgetLimits])

  const monthlyData = useMemo(() => {
    const now = new Date()
    const count = Math.max(3, Math.min(12, Number(analyticsRange) || 6))

    return Array.from({ length: count }, (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - count + 1 + index,
        1
      )

      const key = monthKey(date)
      const transactions = items.filter(
        t => monthKey(new Date(t.date)) === key
      )

      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)

      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)

      return {
        key,
        label: monthLabel(date),
        income,
        expenses,
        net: income - expenses,
      }
    })
  }, [items, analyticsRange])

  const categoryData = useMemo(() => {
    const now = new Date()
    const categoryTotals = new Map()

    items
      .filter(t => {
        const date = new Date(t.date)

        return (
          t.type === 'expense' &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        )
      })
      .forEach(t => {
        const category = t.category || 'Other'

        categoryTotals.set(
          category,
          (categoryTotals.get(category) || 0) + Number(t.amount || 0)
        )
      })

    return [...categoryTotals.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [items])

  const budgetTotal = budgets.reduce((sum, b) => sum + b.limit, 0)
  const budgetSpent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const budgetRemaining = budgetTotal - budgetSpent

  const maxMonthlyValue = Math.max(
    1,
    ...monthlyData.flatMap(d => [d.income, d.expenses])
  )

  const maxCategoryValue = Math.max(
    1,
    ...categoryData.map(category => category.amount)
  )

  const saveBudgetLimit = name => {
    const limit = Number(budgetDraft)

    if (!Number.isFinite(limit) || limit <= 0) {
      setError('Enter a monthly budget greater than zero.')
      return
    }

    setBudgetLimits(current =>
      current.map(b =>
        b.name === name ? { ...b, limit } : b
      )
    )

    setEditingBudget(null)
    setBudgetDraft('')
    setError('')
    setNotice(`${name} budget updated successfully.`)
  }

  const resetBudgets = () => {
    if (!window.confirm('Reset all budget limits to their default values?')) {
      return
    }

    setBudgetLimits(DEFAULT_BUDGETS)
    setEditingBudget(null)
    setBudgetDraft('')
    setNotice('Budget limits reset to defaults.')
    setError('')
  }

  const addTransaction = async event => {
    event.preventDefault()
    setError('')
    setNotice('')

    const amount = Number(form.amount)

    if (!form.name.trim()) {
      setError('Enter a transaction description.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          amount,
          type: form.type,
          category: form.category,
          date: form.date || undefined,
          notes: form.notes.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not save transaction.')
      }

      if (data.transaction) {
        setItems(current => [
          data.transaction,
          ...current.filter(t => t._id !== data.transaction._id),
        ])
      } else {
        await loadTransactions()
      }

      setForm({
        name: '',
        category: 'Food & Groceries',
        amount: '',
        type: 'expense',
        date: new Date().toISOString().slice(0, 10),
        notes: '',
      })

      setShowForm(false)
      setNotice('Transaction saved successfully.')
    } catch (err) {
      setError(err.message || 'Could not save transaction.')
    } finally {
      setSaving(false)
    }
  }

  const deleteTransaction = async id => {
    if (!id) {
      setError('This transaction has no database ID.')
      return
    }

    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return
    }

    setDeletingId(id)
    setError('')
    setNotice('')

    try {
      const response = await fetch(
        `${API_URL}/transactions/${encodeURIComponent(id)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not delete transaction.')
      }

      setItems(current => current.filter(t => t._id !== id))
      setNotice('Transaction deleted successfully.')
    } catch (err) {
      setError(err.message || 'Could not delete transaction.')
    } finally {
      setDeletingId(null)
    }
  }

  const exportCSV = () => {
    const headers = [
      'Description', 'Type', 'Category', 'Amount', 'Date', 'Notes',
    ]

    const rows = filtered.map(t => [
      t.name,
      t.type,
      t.category,
      t.amount,
      formatDate(t.date),
      t.notes || '',
    ])

    const csv = [headers, ...rows]
      .map(row =>
        row
          .map(value =>
            `"${String(value ?? '').replaceAll('"', '""')}"`
          )
          .join(',')
      )
      .join('\r\n')

    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    )

    const link = document.createElement('a')
    link.href = url
    link.download = 'spendwise-transactions.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  const nav = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Transactions', icon: ArrowLeftRight },
    { label: 'Budgets', icon: Wallet },
    { label: 'Analytics', icon: ChartNoAxesCombined },
  ]

 return (
  <>
    {!token ? (
      <div className="auth-page">
        <form className="auth-card" onSubmit={handleAuth}>
          <div className="brand">
            <div className="brand-mark">
              <Wallet size={22} />
            </div>
            <span>spend<span className="brand-light">wise</span></span>
          </div>

          <h1>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p>
            {authMode === 'login'
              ? 'Log in to manage your finances.'
              : 'Create an account to start tracking your money.'}
          </p>

          {error && (
            <div className="app-message error-message" role="alert">
              {error}
            </div>
          )}

          {authMode === 'register' && (
            <label>
              Full name
              <input
                value={authName}
                onChange={e => setAuthName(e.target.value)}
                maxLength={80}
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              minLength={8}
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={authLoading}>
            {authLoading
              ? 'Please wait...'
              : authMode === 'login' ? 'Log in' : 'Create account'}
          </button>

          <p>
            {authMode === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}
            {' '}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login')
                setError('')
              }}
            >
              {authMode === 'login' ? 'Register' : 'Log in'}
            </button>
          </p>
        </form>
      </div>
    ) : (
      <div className="app-shell">
        <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Wallet size={22} /></div>
          <span>spend<span className="brand-light">wise</span></span>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="side-nav">
          {nav.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activePage === label ? 'active' : ''}`}
              onClick={() => setActivePage(label)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`nav-item ${activePage === 'Settings' ? 'active' : ''}`}
            onClick={() => setActivePage('Settings')}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <div className="profile">
            <div className="avatar">{(currentUser?.name || 'U').slice(0, 2).toUpperCase()}</div>
            <div><strong>{currentUser?.name || 'Your account'}</strong><small>{currentUser?.email || 'Personal workspace'}</small></div>
            <button type="button" className="icon-button" onClick={handleLogout} title="Log out" aria-label="Log out"><X size={17} /></button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Menu">
            <Menu size={21} />
          </button>

          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{activePage}</strong>
          </div>

          <div className="top-actions">
            <label className="search-box">
              <Search size={17} />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search transactions..."
              />
            </label>

            <button
              className="icon-button"
              onClick={loadTransactions}
              disabled={loading}
              title="Refresh transactions"
            >
              <RefreshCw size={18} />
            </button>

            <button
              className="icon-button"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={19} />
            </button>

            <div className="top-avatar">ND</div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">PERSONAL FINANCE</div>
              <h1>
                {activePage === 'Overview' ? 'Good to see you' : activePage}
              </h1>
              <p>
                {activePage === 'Budgets'
                  ? 'Plan your monthly spending and stay within your limits.'
                  : activePage === 'Analytics'
                    ? 'Understand your money with insights from your saved transactions.'
                    : activePage === 'Transactions'
                      ? 'Review, search, export, and manage your financial activity.'
                      : activePage === 'Settings'
                        ? 'Manage your workspace preferences and local budget settings.'
                        : "Here's what's happening with your money."}
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() => {
                setError('')
                setNotice('')
                setShowForm(true)
              }}
            >
              <Plus size={18} /> Add transaction
            </button>
          </div>

          {error && (
            <div role="alert" className="app-message error-message">
              <span>{error}</span>
              <button onClick={() => setError('')} aria-label="Dismiss error">
                <X size={18} />
              </button>
            </div>
          )}

          {notice && (
            <div role="status" className="app-message success-message">
              <span><Check size={15} /> {notice}</span>
              <button onClick={() => setNotice('')} aria-label="Dismiss notice">
                <X size={16} />
              </button>
            </div>
          )}

          {activePage === 'Budgets' ? (
            <section className="budget-management-page">
              <div className="budget-overview-grid">
                <article className="budget-overview-card">
                  <span>Total monthly budget</span>
                  <strong>{formatMoney(budgetTotal)}</strong>
                  <small>Across {budgets.length} categories</small>
                </article>

                <article className="budget-overview-card">
                  <span>Spent this month</span>
                  <strong>{formatMoney(budgetSpent)}</strong>
                  <small>Expenses in budgeted categories</small>
                </article>

                <article className={`budget-overview-card ${budgetRemaining < 0 ? 'is-over' : ''}`}>
                  <span>{budgetRemaining < 0 ? 'Over budget' : 'Budget remaining'}</span>
                  <strong>{formatMoney(Math.abs(budgetRemaining))}</strong>
                  <small>
                    {budgetRemaining < 0
                      ? 'Above your combined limits'
                      : 'Available across your categories'}
                  </small>
                </article>
              </div>

              <div className="budget-management-heading">
                <div>
                  <h2>Monthly category budgets</h2>
                  <p>
                    Spending is calculated from saved transactions for the current month.
                  </p>
                </div>

                <button className="secondary-button" onClick={resetBudgets}>
                  <RotateCcw size={15} /> Reset defaults
                </button>
              </div>

              <div className="budget-management-grid">
                {budgets.map(budget => {
                  const over = budget.spent > budget.limit
                  const near = !over && budget.percentage >= 80

                  return (
                    <article className="panel budget-management-card" key={budget.name}>
                      <div className="budget-management-card-head">
                        <div>
                          <span className={`budget-category-dot ${budget.color}`} />
                          <h3>{budget.name}</h3>
                        </div>

                        <span className={`budget-status ${over ? 'over' : near ? 'near' : 'ok'}`}>
                          {over ? 'Over limit' : near ? 'Near limit' : 'On track'}
                        </span>
                      </div>

                      <div className="budget-big-number">
                        {formatMoney(budget.spent)}
                      </div>

                      <p className="budget-spent-caption">spent this month</p>

                      <div className="progress-track budget-large-track">
                        <div
                          className={`progress-fill ${budget.color} ${over ? 'budget-fill-over' : ''}`}
                          style={{
                            width: `${Math.min(100, Math.max(0, budget.percentage))}%`,
                          }}
                        />
                      </div>

                      <div className="budget-management-meta">
                        <span>{Math.round(budget.percentage)}% used</span>
                        <span>{formatMoney(budget.limit)} limit</span>
                      </div>

                      <div className="budget-limit-editor">
                        {editingBudget === budget.name ? (
                          <>
                            <label htmlFor={`budget-${budget.color}`}>
                              New monthly limit (₹)
                            </label>

                            <input
                              id={`budget-${budget.color}`}
                              type="number"
                              min="1"
                              step="1"
                              value={budgetDraft}
                              onChange={event => setBudgetDraft(event.target.value)}
                              onKeyDown={event => {
                                if (event.key === 'Enter') {
                                  saveBudgetLimit(budget.name)
                                }
                              }}
                              autoFocus
                            />

                            <div className="budget-editor-actions">
                              <button
                                className="primary-button"
                                type="button"
                                onClick={() => saveBudgetLimit(budget.name)}
                              >
                                Save limit
                              </button>

                              <button
                                className="secondary-button"
                                type="button"
                                onClick={() => {
                                  setEditingBudget(null)
                                  setBudgetDraft('')
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span>Remaining</span>
                              <strong>{formatMoney(budget.remaining)}</strong>
                            </div>

                            <button
                              className="budget-edit-button"
                              onClick={() => {
                                setEditingBudget(budget.name)
                                setBudgetDraft(String(budget.limit))
                                setError('')
                                setNotice('')
                              }}
                            >
                              <Pencil size={14} /> Edit limit
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>

              <p className="budget-footnote">
                Budget limits are saved in this browser. Category spending includes
                transactions with an exact matching category name.
              </p>
            </section>
          ) : activePage === 'Analytics' ? (
            <section className="analytics-page">
              <div className="analytics-toolbar">
                <div>
                  <h2>Financial overview</h2>
                  <p>Based on your saved transaction history.</p>
                </div>

                <label className="range-select">
                  Period
                  <select
                    value={analyticsRange}
                    onChange={event => setAnalyticsRange(event.target.value)}
                  >
                    <option value="3">Last 3 months</option>
                    <option value="6">Last 6 months</option>
                    <option value="12">Last 12 months</option>
                  </select>
                </label>
              </div>

              <div className="summary-grid analytics-summary">
                <article className="summary-card">
                  <div className="card-label">
                    Total income
                    <span className="metric-icon income-icon">
                      <ArrowDownRight size={18} />
                    </span>
                  </div>
                  <div className="card-value">{formatMoney(totals.income)}</div>
                  <div className="card-foot">
                    <span>All recorded income</span>
                    <span><TrendingUp size={13} /></span>
                  </div>
                </article>

                <article className="summary-card">
                  <div className="card-label">
                    Total expenses
                    <span className="metric-icon expense-icon">
                      <ArrowUpRight size={18} />
                    </span>
                  </div>
                  <div className="card-value">{formatMoney(totals.expenses)}</div>
                  <div className="card-foot">
                    <span>All recorded expenses</span>
                    <span><TrendingDown size={13} /></span>
                  </div>
                </article>

                <article className="summary-card">
                  <div className="card-label">
                    Net balance
                    <span className="card-icon"><Wallet size={18} /></span>
                  </div>
                  <div className="card-value">{formatMoney(totals.balance)}</div>
                  <div className="card-foot">
                    <span>Income minus expenses</span>
                    <span>INR</span>
                  </div>
                </article>

                <article className="summary-card">
                  <div className="card-label">
                    Savings rate
                    <span className="metric-icon savings-icon">
                      <PiggyBank size={18} />
                    </span>
                  </div>
                  <div className="card-value">{totals.savingsRate}%</div>
                  <div className="card-foot">
                    <span>Overall savings ratio</span>
                    <span>{totals.savingsRate >= 20 ? 'Healthy' : 'Keep tracking'}</span>
                  </div>
                </article>
              </div>

              <div className="analytics-grid">
                <article className="panel chart-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Income vs. expenses</h2>
                      <p>Monthly totals · {analyticsRange} month view</p>
                    </div>
                    <CalendarDays size={19} />
                  </div>

                  <div className="chart-legend">
                    <span><i className="legend-income" /> Income</span>
                    <span><i className="legend-expense" /> Expenses</span>
                  </div>

                  <div className="bar-chart" role="img" aria-label="Monthly income and expense bar chart">
                    {monthlyData.map(month => (
                      <div className="bar-group" key={month.key}>
                        <div className="bar-pair">
                          <div
                            className="bar income-bar"
                            title={`Income: ${formatMoney(month.income)}`}
                            style={{
                              height: `${Math.max(
                                month.income ? 4 : 0,
                                month.income / maxMonthlyValue * 100
                              )}%`,
                            }}
                          />
                          <div
                            className="bar expense-bar"
                            title={`Expenses: ${formatMoney(month.expenses)}`}
                            style={{
                              height: `${Math.max(
                                month.expenses ? 4 : 0,
                                month.expenses / maxMonthlyValue * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <span>{month.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="chart-footnote">
                    Hover over a bar to see its amount. Months without transactions display as zero.
                  </div>
                </article>

                <article className="panel category-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Spending by category</h2>
                      <p>Current month expense distribution</p>
                    </div>
                    <Target size={19} />
                  </div>

                  {categoryData.length ? (
                    <div className="category-list">
                      {categoryData.map((category, index) => (
                        <div className="category-item" key={category.name}>
                          <div className="category-item-label">
                            <span className={`category-color color-${index % 5}`} />
                            <strong>{category.name}</strong>
                            <span>{formatMoney(category.amount)}</span>
                          </div>

                          <div className="progress-track">
                            <div
                              className={`progress-fill category-fill-${index % 5}`}
                              style={{
                                width: `${category.amount / maxCategoryValue * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="analytics-empty">
                      <CircleDollarSign size={28} />
                      <strong>No expenses this month</strong>
                      <span>
                        Add expense transactions to see your category breakdown.
                      </span>
                    </div>
                  )}
                </article>
              </div>

              <article className="panel monthly-table-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Monthly breakdown</h2>
                    <p>Income, expenses, and net amount for each month</p>
                  </div>
                </div>

                <div className="transaction-table-wrap">
                  <table className="transaction-table">
                    <thead>
                      <tr>
                        <th>MONTH</th>
                        <th>INCOME</th>
                        <th>EXPENSES</th>
                        <th>NET</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.slice().reverse().map(month => (
                        <tr key={month.key}>
                          <td>
                            <strong>{month.label} {month.key.slice(0, 4)}</strong>
                          </td>
                          <td className="amount-cell income">
                            {formatMoney(month.income)}
                          </td>
                          <td className="amount-cell expense">
                            {formatMoney(month.expenses)}
                          </td>
                          <td className={`amount-cell ${month.net >= 0 ? 'income' : 'expense'}`}>
                            {formatMoney(month.net)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <div className="insight-banner">
                <div className="insight-symbol">
                  <ChartNoAxesCombined size={22} />
                </div>
                <div>
                  <strong>
                    {totals.savingsRate >= 20
                      ? 'You are retaining a good share of your income'
                      : totals.balance >= 0
                        ? 'Keep building your savings habit'
                        : 'Your expenses exceed your income'}
                  </strong>
                  <p>
                    {totals.income === 0
                      ? 'Add income transactions to calculate your savings rate.'
                      : `Your current overall savings rate is ${totals.savingsRate}%. Your recorded net balance is ${formatMoney(totals.balance)}.`}
                  </p>
                </div>
              </div>
            </section>
          ) : activePage === 'Overview' || activePage === 'Transactions' ? (
            <>
              <section className="summary-grid">
                <article className="summary-card balance-card">
                  <div className="card-label">
                    Total balance
                    <span className="card-icon"><Wallet size={18} /></span>
                  </div>
                  <div className="card-value">{formatMoney(totals.balance)}</div>
                  <div className="card-foot">
                    <span className="trend-up">
                      <ArrowUpRight size={15} /> Live calculation
                    </span>
                    <span>INR</span>
                  </div>
                </article>

                <article className="summary-card">
                  <div className="card-label">
                    Total income
                    <span className="metric-icon income-icon">
                      <ArrowDownRight size={18} />
                    </span>
                  </div>
                  <div className="card-value">{formatMoney(totals.income)}</div>
                  <div className="card-foot">
                    <span className="trend-up">Money received</span>
                    <span>All records</span>
                  </div>
                </article>

                <article className="summary-card">
                  <div className="card-label">
                    Total expenses
                    <span className="metric-icon expense-icon">
                      <ArrowUpRight size={18} />
                    </span>
                  </div>
                  <div className="card-value">{formatMoney(totals.expenses)}</div>
                  <div className="card-foot">
                    <span className="trend-down">Money spent</span>
                    <span>All records</span>
                  </div>
                </article>

                <article className="summary-card">
                  <div className="card-label">
                    Savings rate
                    <span className="metric-icon savings-icon">
                      <ChartNoAxesCombined size={18} />
                    </span>
                  </div>
                  <div className="card-value">{totals.savingsRate}%</div>
                  <div className="card-foot">
                    <span>Income minus expenses</span>
                    <span>Current</span>
                  </div>
                </article>
              </section>

              <section className="content-grid">
                <article className="panel transactions-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        {activePage === 'Transactions'
                          ? 'All transactions'
                          : 'Recent transactions'}
                      </h2>
                      <p>
                        {loading
                          ? 'Loading saved transactions...'
                          : `${filtered.length} matching transaction(s)`}
                      </p>
                    </div>

                    <div className="panel-actions">
                      <button
                        className="icon-button"
                        onClick={exportCSV}
                        title="Export filtered transactions as CSV"
                      >
                        <Download size={16} />
                      </button>

                      {activePage === 'Overview' && (
                        <button
                          className="text-button"
                          onClick={() => setActivePage('Transactions')}
                        >
                          View all ↗
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="transaction-table-wrap">
                    <table className="transaction-table">
                      <thead>
                        <tr>
                          <th>TRANSACTION</th>
                          <th>CATEGORY</th>
                          <th>DATE</th>
                          <th className="amount-cell">AMOUNT</th>
                          <th>ACTION</th>
                        </tr>
                      </thead>

                      <tbody>
                        {loading && (
                          <tr>
                            <td colSpan="5" className="empty-state">
                              Loading transactions...
                            </td>
                          </tr>
                        )}

                        {!loading && filtered
                          .slice(0, activePage === 'Transactions' ? filtered.length : 10)
                          .map(transaction => {
                            const Icon = getTransactionIcon(transaction)

                            return (
                              <tr key={transaction._id}>
                                <td>
                                  <div className="transaction-name">
                                    <span className={`transaction-icon ${transaction.type}`}>
                                      <Icon size={17} />
                                    </span>
                                    <strong>{transaction.name}</strong>
                                  </div>
                                </td>

                                <td>
                                  <span className="category-label">
                                    {transaction.category}
                                  </span>
                                </td>

                                <td className="date-cell">
                                  {formatDate(transaction.date)}
                                </td>

                                <td className={`amount-cell ${transaction.type}`}>
                                  {transaction.type === 'income' ? '+' : '−'}
                                  {formatMoney(transaction.amount)}
                                </td>

                                <td>
                                  <button
                                    type="button"
                                    className="delete-button"
                                    title="Delete transaction"
                                    aria-label={`Delete ${transaction.name}`}
                                    disabled={deletingId === transaction._id}
                                    onClick={() => deleteTransaction(transaction._id)}
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}

                        {!loading && filtered.length === 0 && (
                          <tr>
                            <td colSpan="5" className="empty-state">
                              {query
                                ? 'No matching transactions found.'
                                : 'No transactions saved yet. Add your first transaction.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>

                {activePage === 'Overview' && (
                  <article className="panel budget-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Monthly budget</h2>
                        <p>Saved expenses this month</p>
                      </div>
                      <Wallet size={19} />
                    </div>

                    {budgets.map(budget => (
                      <div className="budget-row" key={budget.name}>
                        <div className="budget-label">
                          <strong>{budget.name}</strong>
                          <span>
                            {formatMoney(budget.spent)} / {formatMoney(budget.limit)}
                          </span>
                        </div>

                        <div className="progress-track">
                          <div
                            className={`progress-fill ${budget.color} ${budget.spent > budget.limit ? 'budget-fill-over' : ''}`}
                            style={{
                              width: `${Math.min(100, Math.max(0, budget.percentage))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      className="budget-link"
                      onClick={() => setActivePage('Budgets')}
                    >
                      Manage budgets →
                    </button>
                  </article>
                )}
              </section>

              {activePage === 'Overview' && (
                <section className="insight-banner">
                  <div className="insight-symbol">
                    <ChartNoAxesCombined size={22} />
                  </div>
                  <div>
                    <strong>Build better financial habits</strong>
                    <p>
                      Your dashboard totals update from transactions saved in MongoDB.
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setActivePage('Analytics')}
                  >
                    Explore analytics ↗
                  </button>
                </section>
              )}
            </>
          ) : (
            <section className="settings-page">
              <article className="panel settings-card">
                <div className="settings-icon"><Settings size={20} /></div>
                <div>
                  <h2>Workspace settings</h2>
                  <p>
                    These preferences are stored in this browser. Transaction records
                    remain in your MongoDB database.
                  </p>
                </div>
              </article>

              <article className="panel settings-row">
                <div>
                  <strong>Budget preferences</strong>
                  <p>Reset all four monthly category limits to their original values.</p>
                </div>
                <button className="secondary-button" onClick={resetBudgets}>
                  <RotateCcw size={15} /> Reset budgets
                </button>
              </article>

              <article className="panel settings-row">
                <div>
                  <strong>Transaction data</strong>
                  <p>Export your currently filtered transaction list as a CSV file.</p>
                </div>
                <button className="secondary-button" onClick={exportCSV}>
                  <Download size={15} /> Export CSV
                </button>
              </article>

              <article className="panel settings-row">
                <div>
                  <strong>Refresh data</strong>
                  <p>Reload transaction records from the SpendWise API.</p>
                </div>
                <button
                  className="secondary-button"
                  onClick={loadTransactions}
                  disabled={loading}
                >
                  <RefreshCw size={15} />
                  {loading ? 'Loading...' : 'Refresh transactions'}
                </button>
              </article>

              <p className="budget-footnote">
                SpendWise connects to {API_URL}. Budget limits are browser-local and
                do not change your MongoDB records.
              </p>
            </section>
          )}
        </div>
      </main>

      {showForm && (
        <div
          className="modal-backdrop"
          onClick={() => !saving && setShowForm(false)}
        >
          <form
            className="transaction-modal"
            onClick={event => event.stopPropagation()}
            onSubmit={addTransaction}
          >
            <div className="modal-heading">
              <div>
                <h2>Add transaction</h2>
                <p>Record income or an expense</p>
              </div>
              <button
                type="button"
                className="close-button"
                disabled={saving}
                onClick={() => setShowForm(false)}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <label>
              Description
              <input
                required
                maxLength={120}
                value={form.name}
                onChange={event => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. Grocery shopping"
              />
            </label>

            <label>
              Amount (₹)
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={event => setForm({ ...form, amount: event.target.value })}
                placeholder="Enter amount"
              />
            </label>

            <label>
              Type
              <select
                value={form.type}
                onChange={event => {
                  const type = event.target.value
                  setForm({
                    ...form,
                    type,
                    category: type === 'income' ? 'Income' : 'Food & Groceries',
                  })
                }}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>

            <label>
              Category
              <select
                value={form.category}
                onChange={event => setForm({ ...form, category: event.target.value })}
              >
                {(form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)
                  .map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
              </select>
            </label>

            <label>
              Date
              <input
                type="date"
                value={form.date}
                onChange={event => setForm({ ...form, date: event.target.value })}
              />
            </label>

            <label>
              Notes (optional)
              <input
                maxLength={500}
                value={form.notes}
                onChange={event => setForm({ ...form, notes: event.target.value })}
                placeholder="Additional details"
              />
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={saving}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save transaction'}
              </button>
            </div>
          </form>
        </div>
            )}
      </div>
    )}
  </>
  )
}

export default App