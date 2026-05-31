import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SurveyListPage } from './pages/surveys/SurveyListPage'
import { NewSurveyPage } from './pages/surveys/NewSurveyPage'
import { PromptEditorPage } from './pages/surveys/PromptEditorPage'
import { QuotaEditorPage } from './pages/quotas/QuotaEditorPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { CampaignsPage } from './pages/campaigns/CampaignsPage'
import { CampaignDetailPage } from './pages/campaigns/CampaignDetailPage'
import { CampaignAgentPromptPage } from './pages/campaigns/CampaignAgentPromptPage'
import { QuotaInsightPage } from './pages/campaigns/QuotaInsightPage'
import { PhoneNumbersPage } from './pages/phone-numbers/PhoneNumbersPage'
import { AgentsPage } from './pages/agents/AgentsPage'
import { CallHistoryPage } from './pages/call-history/CallHistoryPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<CampaignsPage />} />
          <Route path="campaigns/:id/agent-prompt" element={<CampaignAgentPromptPage />} />
          <Route path="campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="campaigns/:id/quota-insight" element={<QuotaInsightPage />} />
          <Route path="phone-numbers" element={<PhoneNumbersPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="call-history" element={<CallHistoryPage />} />
          <Route path="surveys" element={<SurveyListPage />} />
          <Route path="surveys/new" element={<NewSurveyPage />} />
          <Route path="surveys/:id/prompt" element={<PromptEditorPage />} />
          <Route path="surveys/:id/quotas" element={<QuotaEditorPage />} />
          <Route path="surveys/:id/dashboard" element={<DashboardPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
